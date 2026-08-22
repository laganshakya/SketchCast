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
      setQuizState((prev) => ({
        ...remoteState,
        userSelectedOption: prev.question?.id === remoteState.question?.id ? prev.userSelectedOption : null,
        isCorrect: prev.question?.id === remoteState.question?.id ? prev.isCorrect : null,
        pointsEarned: prev.question?.id === remoteState.question?.id ? prev.pointsEarned : 0,
      }));

      try {
        localStorage.setItem(quizStorageKey, JSON.stringify(remoteState));
      } catch {
        // ignore
      }

      if (remoteState.endTime) {
        const remaining = Math.max(0, Math.ceil((remoteState.endTime - Date.now()) / 1000));
        setTimeRemaining(remaining);
      }
    });

    const unQuizVote = channelManager.on('quiz_vote', ({ optionId, userId, points }) => {
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

      if (points > 0) {
        setLeaderboard((prev) => {
          const exists = prev.find((u) => u.session_id === userId);
          if (exists) {
            const updatedEntry = {
              ...exists,
              score: exists.score + points,
              correct_quizzes: exists.correct_quizzes + 1,
              streak: exists.streak + 1,
            };
            dbUpsertLeaderboardEntry(updatedEntry, currentRoomKey);
            return prev
              .map((u) => (u.session_id === userId ? updatedEntry : u))
              .sort((a, b) => b.score - a.score);
          }
          const newEntry: LeaderboardEntry = {
            session_id: userId,
            name: userName,
            score: points,
            correct_quizzes: 1,
            polls_voted: 0,
            streak: 1,
            avatar_color: '#FFE600',
          };
          dbUpsertLeaderboardEntry(newEntry, currentRoomKey);
          return [...prev, newEntry].sort((a, b) => b.score - a.score);
        });
      }
    });

    return () => {
      unQuizState();
      unQuizVote();
    };
  }, [channelManager, userName, currentRoomKey, quizStorageKey]);

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
  }, [quizState.isActive, quizState.endTime, quizState.isRevealed]);

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

  const revealAnswer = useCallback(() => {
    setQuizState((prev) => {
      const updated = { ...prev, isRevealed: true };
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

        setUserStreak((prev) => prev + 1);
        triggerConfetti();

        setLeaderboard((prev) => {
          const exists = prev.find((u) => u.session_id === sessionId);
          if (exists) {
            const updatedEntry = {
              ...exists,
              score: exists.score + points,
              correct_quizzes: exists.correct_quizzes + 1,
              streak: exists.streak + 1,
            };
            dbUpsertLeaderboardEntry(updatedEntry, currentRoomKey);
            return prev
              .map((u) => (u.session_id === sessionId ? updatedEntry : u))
              .sort((a, b) => b.score - a.score);
          }
          const newEntry: LeaderboardEntry = {
            session_id: sessionId,
            name: userName,
            score: points,
            correct_quizzes: 1,
            polls_voted: 0,
            streak: 1,
            avatar_color: userRole === 'host' ? '#FFE600' : '#FF2A6D',
          };
          dbUpsertLeaderboardEntry(newEntry, currentRoomKey);
          return [...prev, newEntry].sort((a, b) => b.score - a.score);
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

  return {
    quizState,
    leaderboard,
    timeRemaining,
    userStreak,
    startQuizRound,
    revealAnswer,
    selectOption,
  };
}
