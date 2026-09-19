import { useState, useEffect, useCallback, useRef } from 'react';

import type {
  QuizQuestion,
  QuizRoundState,
  LeaderboardEntry,
  DifficultyTier,
} from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import { generateAdaptiveFollowUpQuestion, calculateDynamicQuestionTimeLimit } from '../lib/meshApi';

import {
  dbFetchLeaderboard,
  dbUpsertLeaderboardEntry,
  dbFetchActiveQuizRound,
  dbSaveActiveQuizRound,
  dbUpdateQuizRoundReveal,
  dbIncrementQuizVote,
} from '../lib/supabase';

export const DIFFICULTY_TIERS: DifficultyTier[] = ['Junior', 'Mid', 'Senior', 'Principal'];

export interface AdaptiveCampaignState {
  isActive: boolean;
  topic: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentDifficulty: DifficultyTier;
  nextPreparedQuestion?: QuizQuestion | null;
  isGeneratingNext?: boolean;
}

export function calculateNextDifficulty(
  current: DifficultyTier,
  accuracyPct: number
): { targetTier: DifficultyTier; adaptationType: 'level_up' | 'stepped_down' | 'maintained' } {
  const currentIdx = Math.max(0, DIFFICULTY_TIERS.indexOf(current));

  if (accuracyPct >= 75) {
    const nextIdx = Math.min(DIFFICULTY_TIERS.length - 1, currentIdx + 1);
    return {
      targetTier: DIFFICULTY_TIERS[nextIdx],
      adaptationType: 'level_up',
    };
  } else if (accuracyPct <= 40) {
    const nextIdx = Math.max(0, currentIdx - 1);
    return {
      targetTier: DIFFICULTY_TIERS[nextIdx],
      adaptationType: 'stepped_down',
    };
  } else {
    return {
      targetTier: current,
      adaptationType: 'maintained',
    };
  }
}

export function useQuizEngine({
  channelManager,
  sessionId,
  userName,
  userRole,
  roomCode,
  appActiveTab,
  onAutoAdvance,
}: {
  channelManager: RealtimeChannelManager | null;
  sessionId: string;
  userName: string;
  userRole: 'host' | 'attendee';
  roomCode: string;
  appActiveTab?: string;
  onAutoAdvance?: () => void;
}) {
  const currentRoomKey = (roomCode || 'SKT-789').toUpperCase().trim();
  const quizStorageKey = `sketchcast_active_quiz_round_${currentRoomKey}`;
  const quizAnswersStorageKey = `sketchcast_quiz_user_answers_${currentRoomKey}`;

  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(quizAnswersStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(quizAnswersStorageKey);
      setUserQuizAnswers(stored ? JSON.parse(stored) : {});
    } catch {
      setUserQuizAnswers({});
    }
  }, [quizAnswersStorageKey]);

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
      votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
    };
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  useEffect(() => {
    leaderboardRef.current = leaderboard;
  }, [leaderboard]);

  const autoAdvanceStorageKey = `sketchcast_host_autoadvance_${currentRoomKey}`;
  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(autoAdvanceStorageKey);
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const onAutoAdvanceRef = useRef(onAutoAdvance);
  useEffect(() => {
    onAutoAdvanceRef.current = onAutoAdvance;
  }, [onAutoAdvance]);

  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number>(5);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const hasAutoAdvancedRef = useRef<boolean>(false);

  const adaptiveCampaignStorageKey = `sketchcast_adaptive_campaign_${currentRoomKey}`;
  const [adaptiveCampaign, setAdaptiveCampaign] = useState<AdaptiveCampaignState | null>(() => {
    try {
      const stored = localStorage.getItem(adaptiveCampaignStorageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const adaptiveCampaignRef = useRef<AdaptiveCampaignState | null>(adaptiveCampaign);
  useEffect(() => {
    adaptiveCampaignRef.current = adaptiveCampaign;
  }, [adaptiveCampaign]);

  const pendingAdvanceRef = useRef<boolean>(false);

  const [timeRemaining, setTimeRemaining] = useState<number>(25);

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
          const isSameQuestion = prev.question?.id === remoteRound.question?.id;
          const cleanRemoteVotes = remoteRound.votesDistribution || { A: 0, B: 0, C: 0, D: 0 };
          const mergedVotes = isSameQuestion
            ? {
                A: Math.max(prev.votesDistribution?.A || 0, cleanRemoteVotes.A || 0),
                B: Math.max(prev.votesDistribution?.B || 0, cleanRemoteVotes.B || 0),
                C: Math.max(prev.votesDistribution?.C || 0, cleanRemoteVotes.C || 0),
                D: Math.max(prev.votesDistribution?.D || 0, cleanRemoteVotes.D || 0),
              }
            : cleanRemoteVotes;

          return {
            ...remoteRound,
            userSelectedOption: isSameQuestion ? prev.userSelectedOption : null,
            isCorrect: isSameQuestion ? prev.isCorrect : null,
            votesDistribution: mergedVotes,
          };
        });

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
          votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
        });
      }
    });
  }, [currentRoomKey]);

  // When roomCode switches, immediately reset quiz state and clear previous room's voted users
  const [prevRoomKey, setPrevRoomKey] = useState(currentRoomKey);
  if (prevRoomKey !== currentRoomKey) {
    setPrevRoomKey(currentRoomKey);
    try {
      const stored = localStorage.getItem(quizStorageKey);
      setQuizState(stored ? JSON.parse(stored) : {
        isActive: false,
        question: null,
        endTime: null,
        totalSeconds: 25,
        isRevealed: false,
        userSelectedOption: null,
        isCorrect: null,
        votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
      });
    } catch {
      setQuizState({
        isActive: false,
        question: null,
        endTime: null,
        totalSeconds: 25,
        isRevealed: false,
        userSelectedOption: null,
        isCorrect: null,
        votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
      });
    }
    setLeaderboard([]);
    try {
      localStorage.removeItem(adaptiveCampaignStorageKey);
    } catch {
      // ignore
    }
    setAdaptiveCampaign(null);
    adaptiveCampaignRef.current = null;
    pendingAdvanceRef.current = false;
  }

  useEffect(() => {
    votedUsersRef.current.clear();
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

        const isSameQuestion = prev.question?.id === remoteState.question?.id;

        // Reset registered votes if this is a new question round
        if (!isSameQuestion) {
          votedUsersRef.current.clear();
        }

        const cleanRemoteVotes = remoteState.votesDistribution || { A: 0, B: 0, C: 0, D: 0 };
        const mergedVotes = isSameQuestion
          ? {
              A: Math.max(prev.votesDistribution?.A || 0, cleanRemoteVotes.A || 0),
              B: Math.max(prev.votesDistribution?.B || 0, cleanRemoteVotes.B || 0),
              C: Math.max(prev.votesDistribution?.C || 0, cleanRemoteVotes.C || 0),
              D: Math.max(prev.votesDistribution?.D || 0, cleanRemoteVotes.D || 0),
            }
          : cleanRemoteVotes;

        const next = {
          ...remoteState,
          userSelectedOption: isSameQuestion ? prev.userSelectedOption : null,
          isCorrect: isSameQuestion ? prev.isCorrect : null,
          votesDistribution: mergedVotes,
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

    const unQuizVote = channelManager.on('quiz_vote', ({ optionId, userId, questionId }: any) => {
      // Prevent double-counting the same user's vote
      if (userId && votedUsersRef.current.has(userId)) {
        return;
      }
      if (userId) {
        votedUsersRef.current.add(userId);
      }

      setQuizState((prev) => {
        // Ignore vote if it belongs to a different question
        if (questionId && prev.question?.id && prev.question.id !== questionId) {
          return prev;
        }

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

  const startQuizRound = useCallback(
    (question: QuizQuestion) => {
      const calculatedDuration = calculateDynamicQuestionTimeLimit(
        question.question,
        question.options,
        question.difficultyTier,
        question.timeLimitSeconds
      );
      const duration = Math.max(question.timeLimitSeconds || 0, calculatedDuration);
      const endTime = Date.now() + duration * 1000;

      votedUsersRef.current.clear();
      hasAutoAdvancedRef.current = false;
      pendingAdvanceRef.current = false;
      setAutoAdvanceCountdown(5);

      const campaign = adaptiveCampaignRef.current;
      const isAdaptive = Boolean(question.adaptiveMeta || (campaign && campaign.isActive));
      const currentIdx = question.adaptiveMeta?.questionNumber || campaign?.currentQuestionIndex || 1;
      const totalCount = question.adaptiveMeta?.totalQuestions || campaign?.totalQuestions || 1;

      // If this was a regular non-adaptive question launched manually, clear the adaptive campaign
      if (!question.adaptiveMeta && !campaign?.isActive) {
        setAdaptiveCampaign(null);
        adaptiveCampaignRef.current = null;
        try {
          localStorage.removeItem(adaptiveCampaignStorageKey);
        } catch {
          // ignore
        }
      }

      const nextState: QuizRoundState = {
        isActive: true,
        question,
        endTime,
        totalSeconds: duration,
        isRevealed: false,
        userSelectedOption: null,
        isCorrect: null,
        votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
        autoAdvanceAt: null,
        isAutoAdvancePaused: false,
        autoAdvanceRemaining: 5,
        isQuizFinished: false,
        isAdaptiveCampaign: isAdaptive,
        adaptiveProgress: isAdaptive ? { current: currentIdx, total: totalCount } : undefined,
        isAIGeneratingNext: false,
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
    [channelManager, currentRoomKey, quizStorageKey, adaptiveCampaignStorageKey]
  );

  const launchNextAdaptiveQuestion = useCallback(
    (nextQ: QuizQuestion) => {
      const camp = adaptiveCampaignRef.current;
      if (camp && camp.isActive) {
        const nextCamp: AdaptiveCampaignState = {
          ...camp,
          currentQuestionIndex: camp.currentQuestionIndex + 1,
          currentDifficulty: nextQ.difficultyTier || camp.currentDifficulty,
          nextPreparedQuestion: null,
          isGeneratingNext: false,
        };
        setAdaptiveCampaign(nextCamp);
        adaptiveCampaignRef.current = nextCamp;
        try {
          localStorage.setItem(adaptiveCampaignStorageKey, JSON.stringify(nextCamp));
        } catch {
          // ignore
        }
      }
      startQuizRound(nextQ);
    },
    [adaptiveCampaignStorageKey, startQuizRound]
  );

  const startAdaptiveCampaign = useCallback(
    async (
      topic: string,
      count: number,
      startDifficulty: DifficultyTier,
      initialQuestion?: QuizQuestion
    ) => {
      let q1 = initialQuestion;
      if (!q1) {
        q1 = await generateAdaptiveFollowUpQuestion({
          topic,
          currentDifficulty: startDifficulty,
          targetDifficulty: startDifficulty,
          accuracyPct: 50,
          questionNumber: 1,
          totalQuestions: count,
          adaptationType: 'maintained',
        });
      }

      q1 = {
        ...q1,
        difficultyTier: startDifficulty,
        adaptiveMeta: {
          questionNumber: 1,
          totalQuestions: count,
          adaptationType: 'maintained',
          previousDifficulty: startDifficulty,
        },
      };

      const newCampaign: AdaptiveCampaignState = {
        isActive: true,
        topic,
        totalQuestions: count,
        currentQuestionIndex: 1,
        currentDifficulty: startDifficulty,
        nextPreparedQuestion: null,
        isGeneratingNext: false,
      };

      setAdaptiveCampaign(newCampaign);
      adaptiveCampaignRef.current = newCampaign;
      try {
        localStorage.setItem(adaptiveCampaignStorageKey, JSON.stringify(newCampaign));
      } catch {
        // ignore
      }

      startQuizRound(q1);
    },
    [adaptiveCampaignStorageKey, startQuizRound]
  );

  const advanceAdaptiveQuestionNow = useCallback(() => {
    if (userRole !== 'host') return;
    const camp = adaptiveCampaignRef.current;
    if (!camp || !camp.isActive) return;

    if (camp.currentQuestionIndex >= camp.totalQuestions) {
      setAdaptiveCampaign(null);
      adaptiveCampaignRef.current = null;
      try {
        localStorage.removeItem(adaptiveCampaignStorageKey);
      } catch {
        // ignore
      }
      if (onAutoAdvanceRef.current) {
        onAutoAdvanceRef.current();
      }
      return;
    }

    if (camp.nextPreparedQuestion) {
      launchNextAdaptiveQuestion(camp.nextPreparedQuestion);
    } else {
      pendingAdvanceRef.current = true;
    }
  }, [userRole, adaptiveCampaignStorageKey, launchNextAdaptiveQuestion]);

  const revealAnswer = useCallback(() => {
    const campaign = adaptiveCampaignRef.current;
    const hasFollowUp = campaign && campaign.isActive && campaign.currentQuestionIndex < campaign.totalQuestions;

    setQuizState((prev) => {
      const autoAdvanceAt = isAutoAdvanceEnabled ? Date.now() + 5000 : null;
      const updated: QuizRoundState = {
        ...prev,
        isRevealed: true,
        autoAdvanceAt,
        isAutoAdvancePaused: false,
        autoAdvanceRemaining: 5,
        isAIGeneratingNext: hasFollowUp && userRole === 'host' ? true : false,
        updatedAt: Date.now(),
      };
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

    // If in adaptive campaign, host immediately kicks off background generation of next question
    if (userRole === 'host' && hasFollowUp && campaign && quizState.question) {
      const prevQ = quizState.question;
      const votes = quizState.votesDistribution || { A: 0, B: 0, C: 0, D: 0 };
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      const correctOpt = prevQ.correctOptionId;
      const correctVotes = correctOpt ? votes[correctOpt] || 0 : 0;
      const accuracyPct = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 50;

      const { targetTier, adaptationType } = calculateNextDifficulty(campaign.currentDifficulty, accuracyPct);
      const nextQNum = campaign.currentQuestionIndex + 1;

      generateAdaptiveFollowUpQuestion({
        topic: campaign.topic,
        currentDifficulty: campaign.currentDifficulty,
        targetDifficulty: targetTier,
        previousQuestion: prevQ.question,
        previousCorrectAnswer: prevQ.options.find((o) => o.id === correctOpt)?.text,
        accuracyPct,
        questionNumber: nextQNum,
        totalQuestions: campaign.totalQuestions,
        adaptationType,
      })
        .then((nextQ) => {
          const curCamp = adaptiveCampaignRef.current;
          if (curCamp && curCamp.isActive) {
            const nextCamp: AdaptiveCampaignState = {
              ...curCamp,
              nextPreparedQuestion: nextQ,
              isGeneratingNext: false,
            };
            setAdaptiveCampaign(nextCamp);
            adaptiveCampaignRef.current = nextCamp;
            try {
              localStorage.setItem(adaptiveCampaignStorageKey, JSON.stringify(nextCamp));
            } catch {
              // ignore
            }
          }

          setQuizState((curr) => {
            const sUpdated: QuizRoundState = {
              ...curr,
              isAIGeneratingNext: false,
              updatedAt: Date.now(),
            };
            try {
              localStorage.setItem(quizStorageKey, JSON.stringify(sUpdated));
            } catch {
              // ignore
            }
            if (channelManager) {
              channelManager.broadcast('quiz_round_state', sUpdated);
            }
            return sUpdated;
          });

          if (pendingAdvanceRef.current) {
            pendingAdvanceRef.current = false;
            launchNextAdaptiveQuestion(nextQ);
          }
        })
        .catch((err) => {
          console.error('[AdaptiveQuiz] Failed to synthesize next question in background:', err);
          setQuizState((curr) => {
            const sUpdated: QuizRoundState = {
              ...curr,
              isAIGeneratingNext: false,
              updatedAt: Date.now(),
            };
            try {
              localStorage.setItem(quizStorageKey, JSON.stringify(sUpdated));
            } catch {
              // ignore
            }
            if (channelManager) {
              channelManager.broadcast('quiz_round_state', sUpdated);
            }
            return sUpdated;
          });
        });
    }
  }, [
    channelManager,
    quizStorageKey,
    isAutoAdvanceEnabled,
    userRole,
    quizState.question,
    quizState.votesDistribution,
    adaptiveCampaignStorageKey,
    launchNextAdaptiveQuestion,
  ]);

  const toggleAutoAdvance = useCallback(
    (forced?: boolean) => {
      if (userRole !== 'host') return;
      setIsAutoAdvanceEnabled((prev) => {
        const next = typeof forced === 'boolean' ? forced : !prev;
        try {
          localStorage.setItem(autoAdvanceStorageKey, JSON.stringify(next));
        } catch {
          // ignore
        }

        // If toggling while a question is currently revealed:
        setQuizState((currentState) => {
          if (!currentState.isRevealed) return currentState;
          const autoAdvanceAt = next ? Date.now() + 5000 : null;
          const updated: QuizRoundState = {
            ...currentState,
            autoAdvanceAt,
            isAutoAdvancePaused: false,
            autoAdvanceRemaining: 5,
            updatedAt: Date.now(),
          };
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

        return next;
      });
    },
    [userRole, autoAdvanceStorageKey, quizStorageKey, channelManager]
  );

  const pauseAutoAdvance = useCallback(() => {
    if (userRole !== 'host') return;
    setQuizState((prev) => {
      if (!prev.isRevealed || !prev.autoAdvanceAt) return prev;
      const remaining = Math.max(0, Math.ceil((prev.autoAdvanceAt - Date.now()) / 1000));
      const updated: QuizRoundState = {
        ...prev,
        isAutoAdvancePaused: true,
        autoAdvanceRemaining: remaining,
        updatedAt: Date.now(),
      };
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
  }, [userRole, quizStorageKey, channelManager]);

  const resumeAutoAdvance = useCallback(() => {
    if (userRole !== 'host') return;
    setQuizState((prev) => {
      if (!prev.isRevealed) return prev;
      const remainingSec = prev.autoAdvanceRemaining && prev.autoAdvanceRemaining > 0 ? prev.autoAdvanceRemaining : 5;
      const autoAdvanceAt = Date.now() + remainingSec * 1000;
      const updated: QuizRoundState = {
        ...prev,
        isAutoAdvancePaused: false,
        autoAdvanceAt,
        updatedAt: Date.now(),
      };
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
  }, [userRole, quizStorageKey, channelManager]);

  // Round countdown timer loop - strictly attendee-local timing
  useEffect(() => {
    if (quizState.isActive && quizState.endTime && !quizState.isRevealed) {
      const updateTimer = () => {
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

  // Auto-advance review countdown effect (5 seconds after reveal)
  useEffect(() => {
    if (quizState.isActive && quizState.isRevealed) {
      if (quizState.isAutoAdvancePaused) {
        if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
        setAutoAdvanceCountdown(quizState.autoAdvanceRemaining ?? 5);
        return;
      }

      if (quizState.autoAdvanceAt) {
        const updateAdvanceTimer = () => {
          const remaining = Math.max(0, Math.ceil((quizState.autoAdvanceAt! - Date.now()) / 1000));
          setAutoAdvanceCountdown(remaining);

          if (remaining === 0) {
            if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
            if (userRole === 'host' && !hasAutoAdvancedRef.current) {
              const camp = adaptiveCampaignRef.current;
              if (camp && camp.isActive) {
                if (camp.currentQuestionIndex >= camp.totalQuestions) {
                  hasAutoAdvancedRef.current = true;
                  setAdaptiveCampaign(null);
                  adaptiveCampaignRef.current = null;
                  try {
                    localStorage.removeItem(adaptiveCampaignStorageKey);
                  } catch {
                    // ignore
                  }
                  if (onAutoAdvanceRef.current) {
                    onAutoAdvanceRef.current();
                  }
                } else if (camp.nextPreparedQuestion) {
                  hasAutoAdvancedRef.current = true;
                  launchNextAdaptiveQuestion(camp.nextPreparedQuestion);
                } else {
                  // Still generating in background!
                  pendingAdvanceRef.current = true;
                }
              } else {
                hasAutoAdvancedRef.current = true;
                if (onAutoAdvanceRef.current) {
                  onAutoAdvanceRef.current();
                }
              }
            }
          }
        };

        updateAdvanceTimer();
        autoAdvanceTimerRef.current = window.setInterval(updateAdvanceTimer, 250);

        return () => {
          if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
        };
      } else {
        setAutoAdvanceCountdown(0);
      }
    } else {
      hasAutoAdvancedRef.current = false;
      setAutoAdvanceCountdown(5);
    }
  }, [
    quizState.isActive,
    quizState.isRevealed,
    quizState.autoAdvanceAt,
    quizState.isAutoAdvancePaused,
    quizState.autoAdvanceRemaining,
    userRole,
    adaptiveCampaignStorageKey,
    launchNextAdaptiveQuestion,
  ]);

  const selectOption = useCallback(
    (optionId: string) => {
      if (!quizState.isActive || quizState.isRevealed || quizState.userSelectedOption) {
        return;
      }

      votedUsersRef.current.add(sessionId);

      const isCorrect = quizState.question?.correctOptionId === optionId;

      if (isCorrect) {
        setLeaderboard((prev) => {
          const cleanUserName = (userName || '').trim().toLowerCase();
          const exists = prev.find(
            (u) =>
              Boolean(sessionId && u.session_id === sessionId) ||
              Boolean(cleanUserName && u.name && u.name.trim().toLowerCase() === cleanUserName)
          );
          let updatedBoard: LeaderboardEntry[];
          let updatedEntry: LeaderboardEntry;
          if (exists) {
            updatedEntry = {
              ...exists,
              name: userName,
              correct_quizzes: exists.correct_quizzes + 1,
              avatar_color: userRole === 'host' ? '#FFE600' : exists.avatar_color || '#FF2A6D',
            };
            updatedBoard = prev
              .map((u) => (u.session_id === exists.session_id ? updatedEntry : u))
              .sort((a, b) => b.correct_quizzes - a.correct_quizzes);
          } else {
            updatedEntry = {
              session_id: sessionId,
              name: userName,
              correct_quizzes: 1,
              polls_voted: 0,
              avatar_color: userRole === 'host' ? '#FFE600' : '#FF2A6D',
            };
            updatedBoard = [...prev, updatedEntry].sort((a, b) => b.correct_quizzes - a.correct_quizzes);
          }
          dbUpsertLeaderboardEntry(updatedEntry, currentRoomKey);
          if (channelManager) {
            channelManager.broadcast('leaderboard_update', updatedBoard);
          }
          return updatedBoard;
        });
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
        const targetQId = quizState.question.id;
        const targetQTitle = quizState.question.question?.trim().toLowerCase();
        setUserQuizAnswers((prev) => {
          const next = { ...prev, [targetQId]: optionId };
          if (targetQTitle) {
            next[targetQTitle] = optionId;
          }
          try {
            localStorage.setItem(quizAnswersStorageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });

        dbIncrementQuizVote(targetQId, optionId).then((serverVotes) => {
          if (serverVotes) {
            setQuizState((prev) => {
              if (prev.question?.id !== targetQId) return prev;
              return {
                ...prev,
                votesDistribution: {
                  A: Math.max(prev.votesDistribution?.A || 0, serverVotes.A || 0),
                  B: Math.max(prev.votesDistribution?.B || 0, serverVotes.B || 0),
                  C: Math.max(prev.votesDistribution?.C || 0, serverVotes.C || 0),
                  D: Math.max(prev.votesDistribution?.D || 0, serverVotes.D || 0),
                },
              };
            });
          }
        });
      }

      if (channelManager) {
        channelManager.broadcast('quiz_vote', {
          optionId,
          userId: sessionId,
          questionId: quizState.question?.id,
        });
      }
    },
    [
      quizState.isActive,
      quizState.isRevealed,
      quizState.userSelectedOption,
      quizState.question,
      quizState.votesDistribution,
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

  const extendQuestionTime = useCallback(
    (additionalSeconds: number = 20) => {
      if (userRole !== 'host') return;
      setQuizState((prev) => {
        if (!prev.isActive || prev.isRevealed || !prev.endTime) return prev;
        const newEndTime = prev.endTime + additionalSeconds * 1000;
        const newTotalSeconds = (prev.totalSeconds || 25) + additionalSeconds;
        const updated: QuizRoundState = {
          ...prev,
          endTime: newEndTime,
          totalSeconds: newTotalSeconds,
          updatedAt: Date.now(),
        };
        try {
          localStorage.setItem(quizStorageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        dbSaveActiveQuizRound(updated, currentRoomKey);
        if (channelManager) {
          channelManager.broadcast('quiz_round_state', updated);
        }
        return updated;
      });
      setTimeRemaining((prev) => prev + additionalSeconds);
    },
    [userRole, quizStorageKey, currentRoomKey, channelManager]
  );

  return {
    quizState,
    leaderboard,
    timeRemaining,
    userQuizAnswers,
    startQuizRound,
    revealAnswer,
    extendQuestionTime,
    selectOption,
    updateAIDeepDive,
    autoAdvanceCountdown,
    isAutoAdvanceEnabled,
    isAutoAdvancePaused: quizState.isAutoAdvancePaused || false,
    toggleAutoAdvance,
    pauseAutoAdvance,
    resumeAutoAdvance,
    adaptiveCampaign,
    startAdaptiveCampaign,
    advanceAdaptiveQuestionNow,
  };
}
