import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { QuizQuestion, QuizRoundState, LeaderboardEntry } from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import {
  dbFetchLeaderboard,
  dbUpsertLeaderboardEntry,
  dbFetchActiveQuizRound,
  dbSaveActiveQuizRound,
  dbUpdateQuizRoundReveal,
  dbUpdateQuizVotes,
} from '../lib/supabase';

export function useQuizEngine({
  channelManager,
  sessionId,
  userName,
  userRole,
  roomCode,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
  roomCode: string;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const quizStorageKey = `sketchcast_active_quiz_round_${currentRoomKey}`;

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

  // Load from Supabase DB on mount & when roomCode changes
  useEffect(() => {
    // 1. Leaderboard
    dbFetchLeaderboard(currentRoomKey).then((remoteBoard) => {
      if (remoteBoard) {
        setLeaderboard(remoteBoard);
      }
    });

    // 2. Active Quiz Round from Supabase for this room
    dbFetchActiveQuizRound(currentRoomKey).then((remoteRound) => {
      if (remoteRound && remoteRound.question) {
        setQuizState((prev) => ({
          ...remoteRound,
          userSelectedOption: prev.question?.id === remoteRound.question?.id ? prev.userSelectedOption : null,
          isCorrect: prev.question?.id === remoteRound.question?.id ? prev.isCorrect : null,
          pointsEarned: prev.question?.id === remoteRound.question?.id ? prev.pointsEarned : 0,
        }));

        if (remoteRound.endTime) {
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

        const next = {
          ...remoteState,
          userSelectedOption: prev.question?.id === remoteState.question?.id ? prev.userSelectedOption : null,
          isCorrect: prev.question?.id === remoteState.question?.id ? prev.isCorrect : null,
          pointsEarned: prev.question?.id === remoteState.question?.id ? prev.pointsEarned : 0,
        };

        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }

        if (next.endTime) {
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

    const unQuizVote = channelManager.on('quiz_vote', ({ optionId }) => {
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

  // Round countdown timer loop
  useEffect(() => {
    if (quizState.isActive && quizState.endTime && !quizState.isRevealed) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((quizState.endTime! - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          revealAnswer();
        }
      };

      updateTimer();
      timerRef.current = window.setInterval(updateTimer, 500);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [quizState.isActive, quizState.endTime, quizState.isRevealed, revealAnswer]);

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

  const startQuizRound = useCallback(
    (question: QuizQuestion) => {
      const duration = question.timeLimitSeconds || 25;
      const endTime = Date.now() + duration * 1000;

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

      const isCorrect = quizState.question?.correctOptionId === optionId;
      let points = 0;

      if (isCorrect) {
        const timeRatio = Math.max(0.1, timeRemaining / quizState.totalSeconds);
        const streakMultiplier = userStreak >= 3 ? 2.0 : userStreak >= 1 ? 1.5 : 1.0;
        points = Math.round((100 + timeRatio * 150) * streakMultiplier);

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
        setUserStreak(0);
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
        dbUpdateQuizVotes(quizState.question.id, updatedVotes);
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
      sessionId,
      userName,
      userRole,
      channelManager,
      currentRoomKey,
      quizStorageKey,
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
    startQuizRound,
    revealAnswer,
    selectOption,
    updateAIDeepDive,
  };
}
