import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { QuizQuestion, QuizRoundState, LeaderboardEntry, PowerUpType, PowerUpInventory } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { playPowerUpSound } from '../lib/soundFx';
import {
  dbFetchLeaderboard,
  dbUpsertLeaderboardEntry,
  dbFetchActiveQuizRound,
  dbSaveActiveQuizRound,
  dbUpdateQuizRoundReveal,
  dbIncrementQuizVote,
} from '../lib/supabase';

export function useQuizEngine({
  channelManager,
  sessionId,
  userName,
  userRole,
  roomCode,
  appActiveTab,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
  roomCode: string;
  appActiveTab?: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const quizStorageKey = `sketchcast_active_quiz_round_${currentRoomKey}`;
  const powerUpsStorageKey = `sketchcast_powerups_${currentRoomKey}_${sessionId}`;

  const [powerUpInventory, setPowerUpInventory] = useState<PowerUpInventory>(() => {
    try {
      const stored = localStorage.getItem(powerUpsStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return { '50-50': 1, 'double-down': 1, 'streak-shield': 1, 'time-freeze': 1 };
  });

  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<string[]>([]);
  const isTimeFrozenRef = useRef<boolean>(false);
  const freezeTimeoutRef = useRef<number | null>(null);
  const votedUsersRef = useRef<Set<string>>(new Set());

  const [quizState, setQuizState] = useState<QuizRoundState>(() => {
    try {
      const stored = localStorage.getItem(quizStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QuizRoundState;
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      isActive: false,
      question: null,
      endTime: null,
      totalSeconds: 25,
      isRevealed: false,
      userSelectedOption: null,
      isCorrect: null,
      pointsEarned: 0,
      votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(25);
  const [userStreak, setUserStreak] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const syncQuizAndLeaderboardFromDB = useCallback(() => {
    // 1. Leaderboard
    dbFetchLeaderboard(currentRoomKey).then((remoteBoard) => {
      if (remoteBoard) {
        setLeaderboard(remoteBoard);
      }
    });

    // 2. Active Quiz Round from Supabase for this room
    dbFetchActiveQuizRound(currentRoomKey).then((remoteRound) => {
      if (remoteRound && remoteRound.question) {
        setQuizState((prev) => {
          const mergedVotes = {
            A: Math.max(prev.votesDistribution?.A || 0, remoteRound.votesDistribution?.A || 0),
            B: Math.max(prev.votesDistribution?.B || 0, remoteRound.votesDistribution?.B || 0),
            C: Math.max(prev.votesDistribution?.C || 0, remoteRound.votesDistribution?.C || 0),
            D: Math.max(prev.votesDistribution?.D || 0, remoteRound.votesDistribution?.D || 0),
          };
          return {
            ...remoteRound,
            userSelectedOption: prev.question?.id === remoteRound.question?.id ? prev.userSelectedOption : null,
            isCorrect: prev.question?.id === remoteRound.question?.id ? prev.isCorrect : null,
            pointsEarned: prev.question?.id === remoteRound.question?.id ? prev.pointsEarned : 0,
            votesDistribution: mergedVotes,
          };
        });

        if (remoteRound.endTime && !isTimeFrozenRef.current) {
          const remaining = Math.max(0, Math.ceil((remoteRound.endTime - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }
      } else {
        setQuizState({
          isActive: false,
          question: null,
          endTime: null,
          totalSeconds: 25,
          isRevealed: false,
          userSelectedOption: null,
          isCorrect: null,
          pointsEarned: 0,
          votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
        });
      }
    });
  }, [currentRoomKey]);

  // Load from Supabase DB on mount, when roomCode changes, or when active tab switches to quiz/leaderboard
  useEffect(() => {
    syncQuizAndLeaderboardFromDB();
  }, [currentRoomKey, appActiveTab, syncQuizAndLeaderboardFromDB]);

  // Sync state from realtime channel
  useEffect(() => {
    if (!channelManager) return;

    const unQuizState = channelManager.on('quiz_round_state', (remoteState) => {
      setQuizState((prev) => {
        // Prevent stale / out-of-order race conditions from DB polling or lagged messages
        if (prev.updatedAt && remoteState.updatedAt && remoteState.updatedAt < prev.updatedAt) {
          return prev;
        }
        if (prev.question?.id === remoteState.question?.id && prev.isRevealed && !remoteState.isRevealed) {
          return prev;
        }

        // Reset power-ups if this is a new question round
        if (prev.question?.id !== remoteState.question?.id) {
          setActivePowerUp(null);
          setEliminatedOptionIds([]);
          isTimeFrozenRef.current = false;
          if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
          votedUsersRef.current.clear();
        }

        const mergedVotes = {
          A: Math.max(prev.votesDistribution?.A || 0, remoteState.votesDistribution?.A || 0),
          B: Math.max(prev.votesDistribution?.B || 0, remoteState.votesDistribution?.B || 0),
          C: Math.max(prev.votesDistribution?.C || 0, remoteState.votesDistribution?.C || 0),
          D: Math.max(prev.votesDistribution?.D || 0, remoteState.votesDistribution?.D || 0),
        };

        const next = {
          ...remoteState,
          userSelectedOption: prev.question?.id === remoteState.question?.id ? prev.userSelectedOption : null,
          isCorrect: prev.question?.id === remoteState.question?.id ? prev.isCorrect : null,
          pointsEarned: prev.question?.id === remoteState.question?.id ? prev.pointsEarned : 0,
          votesDistribution: mergedVotes,
        };

        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }

        if (next.endTime && !isTimeFrozenRef.current) {
          const remaining = Math.max(0, Math.ceil((next.endTime - Date.now()) / 1000));
          setTimeRemaining(remaining);
        }

        return next;
      });
    });

    const unLeaderboard = channelManager.on('leaderboard_update', (remoteBoard) => {
      if (remoteBoard && Array.isArray(remoteBoard)) {
        setLeaderboard(remoteBoard);
      }
    });

    const unQuizVote = channelManager.on('quiz_vote', ({ optionId, userId }) => {
      // Prevent double-counting the same user's vote
      if (userId && votedUsersRef.current.has(userId)) {
        return;
      }
      if (userId) {
        votedUsersRef.current.add(userId);
      }

      setQuizState((prev) => {
        const nextVotes = {
          ...prev.votesDistribution,
          [optionId]: (prev.votesDistribution[optionId] || 0) + 1,
        };
        const updated = {
          ...prev,
          votesDistribution: nextVotes,
        };
        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      // Refetch latest leaderboard from database to sync all players
      dbFetchLeaderboard(currentRoomKey).then((remoteBoard) => {
        if (remoteBoard && remoteBoard.length > 0) {
          setLeaderboard(remoteBoard);
        }
      });
    });

    return () => {
      unQuizState();
      unQuizVote();
      unLeaderboard();
    };
  }, [channelManager, currentRoomKey, quizStorageKey]);

  const revealAnswer = useCallback(() => {
    setQuizState((prev) => {
      const updated = { ...prev, isRevealed: true, updatedAt: Date.now() };
      try {
        localStorage.setItem(quizStorageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }

      if (prev.question) {
        dbUpdateQuizRoundReveal(prev.question.id);
      }

      if (channelManager) {
        channelManager.broadcast('quiz_round_state', updated);
      }
      return updated;
    });
  }, [channelManager, quizStorageKey]);

  // Round countdown timer loop - strictly attendee-local timing
  useEffect(() => {
    if (quizState.isActive && quizState.endTime && !quizState.isRevealed) {
      const updateTimer = () => {
        // If this specific attendee used Time Freeze, their local countdown is frozen
        if (isTimeFrozenRef.current) return;
        const remaining = Math.max(0, Math.ceil((quizState.endTime! - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          // ONLY HOST auto-reveals question for the room on timer expiration
          if (userRole === 'host') {
            revealAnswer();
          }
        }
      };

      updateTimer();
      timerRef.current = window.setInterval(updateTimer, 500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [quizState.isActive, quizState.endTime, quizState.isRevealed, revealAnswer, userRole]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFE600', '#FF2A6D', '#00F0FF', '#00F59B', '#9B5DE5'],
      });
    } catch {
      // ignore
    }
  };

  const activatePowerUp = useCallback(
    (type: PowerUpType) => {
      if (
        !quizState.isActive ||
        quizState.isRevealed ||
        quizState.userSelectedOption ||
        (powerUpInventory[type] || 0) <= 0 ||
        activePowerUp === type
      ) {
        return;
      }

      // Deduct inventory
      const nextInventory = {
        ...powerUpInventory,
        [type]: Math.max(0, (powerUpInventory[type] || 0) - 1),
      };
      setPowerUpInventory(nextInventory);
      try {
        localStorage.setItem(powerUpsStorageKey, JSON.stringify(nextInventory));
      } catch {
        // ignore
      }

      playPowerUpSound(type);

      if (type === '50-50') {
        if (quizState.question) {
          const wrongOpts = quizState.question.options
            .filter((o) => o.id !== quizState.question!.correctOptionId)
            .map((o) => o.id);
          // Randomly pick up to 2 wrong options to prune
          const shuffled = [...wrongOpts].sort(() => 0.5 - Math.random());
          const toEliminate = shuffled.slice(0, 2);
          setEliminatedOptionIds(toEliminate);
        }
      } else if (type === 'double-down') {
        setActivePowerUp('double-down');
      } else if (type === 'streak-shield') {
        setActivePowerUp('streak-shield');
      } else if (type === 'time-freeze') {
        setActivePowerUp('time-freeze');
        setTimeRemaining((prev) => prev + 5);
        isTimeFrozenRef.current = true;
        if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
        freezeTimeoutRef.current = window.setTimeout(() => {
          isTimeFrozenRef.current = false;
        }, 5000);
      }
    },
    [
      quizState.isActive,
      quizState.isRevealed,
      quizState.userSelectedOption,
      quizState.question,
      powerUpInventory,
      activePowerUp,
      powerUpsStorageKey,
    ]
  );

  const startQuizRound = useCallback(
    (question: QuizQuestion) => {
      const duration = question.timeLimitSeconds || 25;
      const endTime = Date.now() + duration * 1000;

      // Reset tactical power-up states for new round
      setActivePowerUp(null);
      setEliminatedOptionIds([]);
      isTimeFrozenRef.current = false;
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
      votedUsersRef.current.clear();

      const nextState: QuizRoundState = {
        isActive: true,
        question,
        endTime,
        totalSeconds: duration,
        isRevealed: false,
        userSelectedOption: null,
        isCorrect: null,
        pointsEarned: 0,
        votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
        updatedAt: Date.now(),
      };

      setQuizState(nextState);
      setTimeRemaining(duration);

      try {
        localStorage.setItem(quizStorageKey, JSON.stringify(nextState));
      } catch {
        // ignore
      }

      // Persist to Supabase Postgres with current room key
      dbSaveActiveQuizRound(nextState, currentRoomKey);

      // Broadcast over Supabase Realtime & Local BroadcastChannel
      if (channelManager) {
        channelManager.broadcast('quiz_round_state', nextState);
      }
    },
    [channelManager, currentRoomKey, quizStorageKey]
  );

  const selectOption = useCallback(
    (optionId: string) => {
      if (!quizState.isActive || quizState.isRevealed || quizState.userSelectedOption) {
        return;
      }

      votedUsersRef.current.add(sessionId);

      const isCorrect = quizState.question?.correctOptionId === optionId;
      let points = 0;

      if (isCorrect) {
        const timeRatio = Math.max(0.1, timeRemaining / quizState.totalSeconds);
        const streakMultiplier = userStreak >= 3 ? 2.0 : userStreak >= 1 ? 1.5 : 1.0;
        let basePoints = Math.round((100 + timeRatio * 150) * streakMultiplier);

        // Apply Double-Down 2x multiplier
        if (activePowerUp === 'double-down') {
          basePoints = basePoints * 2;
        }

        points = basePoints;
        const nextStreak = userStreak + 1;
        setUserStreak(nextStreak);
        triggerConfetti();

        setLeaderboard((prev) => {
          const exists = prev.find((u) => u.session_id === sessionId);
          let updatedBoard: LeaderboardEntry[];
          let updatedEntry: LeaderboardEntry;
          if (exists) {
            updatedEntry = {
              ...exists,
              name: userName,
              score: exists.score + points,
              correct_quizzes: exists.correct_quizzes + 1,
              streak: nextStreak,
              avatar_color: userRole === 'host' ? '#FFE600' : exists.avatar_color || '#FF2A6D',
            };
            updatedBoard = prev
              .map((u) => (u.session_id === sessionId ? updatedEntry : u))
              .sort((a, b) => b.score - a.score);
          } else {
            updatedEntry = {
              session_id: sessionId,
              name: userName,
              score: points,
              correct_quizzes: 1,
              polls_voted: 0,
              streak: nextStreak,
              avatar_color: userRole === 'host' ? '#FFE600' : '#FF2A6D',
            };
            updatedBoard = [...prev, updatedEntry].sort((a, b) => b.score - a.score);
          }
          dbUpsertLeaderboardEntry(updatedEntry, currentRoomKey);
          if (channelManager) {
            channelManager.broadcast('leaderboard_update', updatedBoard);
          }
          return updatedBoard;
        });
      } else {
        // Incorrect answer handling
        if (activePowerUp === 'double-down') {
          // Double down penalty (-50 pts)
          points = -50;
          setLeaderboard((prev) => {
            const exists = prev.find((u) => u.session_id === sessionId);
            if (exists) {
              const updatedEntry = {
                ...exists,
                score: Math.max(0, exists.score - 50),
                streak: 0,
              };
              const updatedBoard = prev
                .map((u) => (u.session_id === sessionId ? updatedEntry : u))
                .sort((a, b) => b.score - a.score);
              dbUpsertLeaderboardEntry(updatedEntry, currentRoomKey);
              if (channelManager) {
                channelManager.broadcast('leaderboard_update', updatedBoard);
              }
              return updatedBoard;
            }
            return prev;
          });
        }

        // Streak Shield check
        if (activePowerUp === 'streak-shield') {
          // Shield protects the streak!
          console.log('[PowerUp] Streak Shield protected user streak:', userStreak);
        } else {
          setUserStreak(0);
        }
      }

      const updatedVotes = {
        ...quizState.votesDistribution,
        [optionId]: (quizState.votesDistribution[optionId] || 0) + 1,
      };

      setQuizState((prev) => {
        const updated = {
          ...prev,
          userSelectedOption: optionId,
          isCorrect,
          pointsEarned: points,
          votesDistribution: updatedVotes,
        };
        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      if (quizState.question) {
        dbIncrementQuizVote(quizState.question.id, optionId).then((serverVotes) => {
          if (serverVotes) {
            setQuizState((prev) => ({
              ...prev,
              votesDistribution: {
                A: Math.max(prev.votesDistribution?.A || 0, serverVotes.A || 0),
                B: Math.max(prev.votesDistribution?.B || 0, serverVotes.B || 0),
                C: Math.max(prev.votesDistribution?.C || 0, serverVotes.C || 0),
                D: Math.max(prev.votesDistribution?.D || 0, serverVotes.D || 0),
              },
            }));
          }
        });
      }

      if (channelManager) {
        channelManager.broadcast('quiz_vote', {
          optionId,
          userId: sessionId,
          points,
        });
      }
    },
    [
      quizState.isActive,
      quizState.isRevealed,
      quizState.userSelectedOption,
      quizState.question,
      quizState.totalSeconds,
      quizState.votesDistribution,
      timeRemaining,
      userStreak,
      activePowerUp,
      sessionId,
      userName,
      userRole,
      currentRoomKey,
      quizStorageKey,
      channelManager,
    ]
  );

  const updateAIDeepDive = useCallback(
    (deepDive: string) => {
      setQuizState((prev) => {
        const updated = { ...prev, aiDeepDive: deepDive, updatedAt: Date.now() };
        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        if (channelManager) {
          channelManager.broadcast('quiz_round_state', updated);
        }
        return updated;
      });
    },
    [channelManager, quizStorageKey]
  );

  return {
    quizState,
    leaderboard,
    timeRemaining,
    userStreak,
    powerUpInventory,
    activePowerUp,
    eliminatedOptionIds,
    activatePowerUp,
    startQuizRound,
    revealAnswer,
    selectOption,
    updateAIDeepDive,
  };
}
