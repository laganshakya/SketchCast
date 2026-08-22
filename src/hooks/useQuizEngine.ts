import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { QuizQuestion, QuizRoundState, LeaderboardEntry } from '../types';
import { QUIZ_PACKS } from '../lib/quizBank';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  {
    session_id: 'user_alexa_1',
    name: 'Elena Rostova',
    score: 1850,
    correct_quizzes: 5,
    polls_voted: 6,
    streak: 4,
    avatar_color: '#EC4899',
  },
  {
    session_id: 'user_marcus_2',
    name: 'Marcus DEV',
    score: 1520,
    correct_quizzes: 4,
    polls_voted: 5,
    streak: 2,
    avatar_color: '#3B82F6',
  },
  {
    session_id: 'user_sarah_1',
    name: 'Sarah (Infra)',
    score: 1240,
    correct_quizzes: 3,
    polls_voted: 7,
    streak: 1,
    avatar_color: '#10B981',
  },
  {
    session_id: 'user_dave_4',
    name: 'Dave (SecOps)',
    score: 890,
    correct_quizzes: 2,
    polls_voted: 4,
    streak: 0,
    avatar_color: '#F59E0B',
  },
];

const DEFAULT_QUIZ_QUESTION = QUIZ_PACKS[0].questions[0];

export function useQuizEngine({
  channelManager,
  sessionId,
  userName,
  userRole,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
}) {
  const [quizState, setQuizState] = useState<QuizRoundState>({
    isActive: true,
    question: DEFAULT_QUIZ_QUESTION,
    endTime: Date.now() + 25 * 1000,
    totalSeconds: 25,
    isRevealed: false,
    userSelectedOption: null,
    isCorrect: null,
    pointsEarned: 0,
    votesDistribution: { A: 14, B: 3, C: 2, D: 1 },
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [timeRemaining, setTimeRemaining] = useState<number>(25);
  const [userStreak, setUserStreak] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  // Sync state from realtime channel
  useEffect(() => {
    if (!channelManager) return;

    const unQuizState = channelManager.on('quiz_round_state', (remoteState) => {
      setQuizState((prev) => ({
        ...remoteState,
        // Preserve user local selection if any
        userSelectedOption: prev.question?.id === remoteState.question?.id ? prev.userSelectedOption : null,
        isCorrect: prev.question?.id === remoteState.question?.id ? prev.isCorrect : null,
        pointsEarned: prev.question?.id === remoteState.question?.id ? prev.pointsEarned : 0,
      }));
    });

    const unQuizVote = channelManager.on('quiz_vote', ({ optionId, userId, points }) => {
      setQuizState((prev) => ({
        ...prev,
        votesDistribution: {
          ...prev.votesDistribution,
          [optionId]: (prev.votesDistribution[optionId] || 0) + 1,
        },
      }));

      if (points > 0) {
        setLeaderboard((prev) => {
          const exists = prev.find((u) => u.session_id === userId);
          if (exists) {
            return prev
              .map((u) =>
                u.session_id === userId
                  ? {
                      ...u,
                      score: u.score + points,
                      correct_quizzes: u.correct_quizzes + 1,
                      streak: u.streak + 1,
                    }
                  : u
              )
              .sort((a, b) => b.score - a.score);
          }
          return [
            ...prev,
            {
              session_id: userId,
              name: userName,
              score: points,
              correct_quizzes: 1,
              polls_voted: 0,
              streak: 1,
              avatar_color: '#6366F1',
            },
          ].sort((a, b) => b.score - a.score);
        });
      }
    });

    return () => {
      unQuizState();
      unQuizVote();
    };
  }, [channelManager, userName]);

  // Round countdown timer loop
  useEffect(() => {
    if (quizState.isActive && quizState.endTime && !quizState.isRevealed) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((quizState.endTime! - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (remaining === 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto reveal when timer hits 0
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
        colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'],
      });
    } catch {
      // ignore
    }
  };

  // Host Action: Start New Quiz Round
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

      if (channelManager) {
        channelManager.broadcast('quiz_round_state', nextState);
      }
    },
    [channelManager]
  );

  // Host Action: Reveal Answer and Explanation
  const revealAnswer = useCallback(() => {
    setQuizState((prev) => {
      const updated = { ...prev, isRevealed: true };
      if (channelManager) {
        channelManager.broadcast('quiz_round_state', updated);
      }
      return updated;
    });
  }, [channelManager]);

  // Attendee Action: Select Option (A, B, C, D)
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

        // Update local score
        setLeaderboard((prev) => {
          const exists = prev.find((u) => u.session_id === sessionId);
          if (exists) {
            return prev
              .map((u) =>
                u.session_id === sessionId
                  ? {
                      ...u,
                      score: u.score + points,
                      correct_quizzes: u.correct_quizzes + 1,
                      streak: u.streak + 1,
                    }
                  : u
              )
              .sort((a, b) => b.score - a.score);
          }
          return [
            ...prev,
            {
              session_id: sessionId,
              name: userName,
              score: points,
              correct_quizzes: 1,
              polls_voted: 0,
              streak: 1,
              avatar_color: userRole === 'host' ? '#6366F1' : '#EC4899',
            },
          ].sort((a, b) => b.score - a.score);
        });
      } else {
        setUserStreak(0);
      }

      setQuizState((prev) => ({
        ...prev,
        userSelectedOption: optionId,
        isCorrect,
        pointsEarned: points,
        votesDistribution: {
          ...prev.votesDistribution,
          [optionId]: (prev.votesDistribution[optionId] || 0) + 1,
        },
      }));

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
      timeRemaining,
      userStreak,
      sessionId,
      userName,
      userRole,
      channelManager,
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
