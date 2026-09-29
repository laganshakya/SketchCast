import { useState, useEffect, useCallback, useRef } from 'react';

import type {
  QuizQuestion,
  QuizRoundState,
  LeaderboardEntry,
  DifficultyTier,
} from '../types';
import { RealtimeChannelManager } from '../lib/realtime/channelManager';
import {
  generateAdaptiveFollowUpQuestion,
  calculateDynamicQuestionTimeLimit,
  type QuizQuestionFormat,
} from '../lib/meshApi';

import {
  dbFetchLeaderboard,
  dbUpsertLeaderboardEntry,
  dbFetchActiveQuizRound,
  dbSaveActiveQuizRound,
  dbUpdateQuizRoundReveal,
  dbClearActiveQuizRound,
} from '../lib/supabase';

export const DIFFICULTY_TIERS: DifficultyTier[] = ['Junior', 'Mid', 'Senior', 'Principal'];

export interface AdaptiveCampaignState {
  isActive: boolean;
  topic: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentDifficulty: DifficultyTier;
  format?: QuizQuestionFormat;
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

  const [prevQuizAnswersKey, setPrevQuizAnswersKey] = useState(quizAnswersStorageKey);
  if (quizAnswersStorageKey !== prevQuizAnswersKey) {
    setPrevQuizAnswersKey(quizAnswersStorageKey);
    try {
      const stored = localStorage.getItem(quizAnswersStorageKey);
      setUserQuizAnswers(stored ? JSON.parse(stored) : {});
    } catch {
      setUserQuizAnswers({});
    }
  }

  const votedUsersRef = useRef<Set<string>>(new Set());

  const [quizState, setQuizState] = useState<QuizRoundState>(() => {
    try {
      const stored = localStorage.getItem(quizStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QuizRoundState;
        if (parsed && parsed.isActive && parsed.question && !parsed.isQuizFinished) {
          return parsed;
        }
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
      const stored = localStorage.getItem(autoAdvanceStorageKey) ?? localStorage.getItem('sketchcast_host_autoadvance');
      return stored !== null ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const [prevAutoAdvanceStorageKey, setPrevAutoAdvanceStorageKey] = useState(autoAdvanceStorageKey);
  if (prevAutoAdvanceStorageKey !== autoAdvanceStorageKey) {
    setPrevAutoAdvanceStorageKey(autoAdvanceStorageKey);
    try {
      const stored = localStorage.getItem(autoAdvanceStorageKey) ?? localStorage.getItem('sketchcast_host_autoadvance');
      setIsAutoAdvanceEnabled(stored !== null ? JSON.parse(stored) : true);
    } catch {
      setIsAutoAdvanceEnabled(true);
    }
  }

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
  const recordedRoundScoreRef = useRef<string | null>(null);

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
      if (remoteRound && remoteRound.question && remoteRound.isActive) {
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

          let effectiveAutoAdvanceAt: number | null = null;
          if (typeof remoteRound.autoAdvanceAt === 'number') {
            effectiveAutoAdvanceAt = remoteRound.autoAdvanceAt;
          } else if (isSameQuestion && prev.isRevealed && prev.autoAdvanceAt) {
            effectiveAutoAdvanceAt = isAutoAdvanceEnabled ? prev.autoAdvanceAt : null;
          }

          return {
            ...remoteRound,
            autoAdvanceAt: effectiveAutoAdvanceAt,
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
  }, [currentRoomKey, isAutoAdvanceEnabled]);

  // When roomCode switches, immediately reset quiz state and clear previous room's voted users
  const [prevRoomKey, setPrevRoomKey] = useState(currentRoomKey);
  if (prevRoomKey !== currentRoomKey) {
    setPrevRoomKey(currentRoomKey);
    try {
      const stored = localStorage.getItem(quizStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QuizRoundState;
        if (parsed && parsed.isActive && parsed.question && !parsed.isQuizFinished) {
          setQuizState(parsed);
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
  }

  useEffect(() => {
    votedUsersRef.current.clear();
    adaptiveCampaignRef.current = null;
    pendingAdvanceRef.current = false;
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
        // If remote state indicates round is cleared/inactive or finished, immediately clear local state
        if (!remoteState || !remoteState.isActive || !remoteState.question || remoteState.isQuizFinished) {
          const cleared: QuizRoundState = {
            isActive: false,
            question: null,
            endTime: null,
            totalSeconds: 25,
            isRevealed: false,
            userSelectedOption: null,
            isCorrect: null,
            votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
            autoAdvanceAt: null,
            isAutoAdvancePaused: false,
            autoAdvanceRemaining: 0,
            isQuizFinished: remoteState?.isQuizFinished ?? false,
            updatedAt: remoteState?.updatedAt || Date.now(),
          };
          try {
            localStorage.setItem(quizStorageKey, JSON.stringify(cleared));
          } catch {
            // ignore
          }
          setTimeRemaining(0);
          return cleared;
        }

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

        let effectiveAutoAdvanceAt: number | null = null;
        if (typeof remoteState.autoAdvanceAt === 'number') {
          effectiveAutoAdvanceAt = remoteState.autoAdvanceAt;
        } else if (isSameQuestion && prev.isRevealed && prev.autoAdvanceAt) {
          effectiveAutoAdvanceAt = isAutoAdvanceEnabled ? prev.autoAdvanceAt : null;
        }

        const effectivePaused =
          typeof remoteState.isAutoAdvancePaused === 'boolean'
            ? remoteState.isAutoAdvancePaused
            : (isSameQuestion ? prev.isAutoAdvancePaused : false);

        const next: QuizRoundState = {
          ...remoteState,
          autoAdvanceAt: effectiveAutoAdvanceAt,
          isAutoAdvancePaused: effectivePaused,
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
    });

    return () => {
      unQuizState();
      unQuizVote();
      unLeaderboard();
    };
  }, [channelManager, currentRoomKey, quizStorageKey, isAutoAdvanceEnabled]);

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
      recordedRoundScoreRef.current = null;
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
      initialQuestion?: QuizQuestion,
      format?: QuizQuestionFormat
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
          format,
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
        format,
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
    } else if (camp.isGeneratingNext || quizState.isAIGeneratingNext) {
      pendingAdvanceRef.current = true;
    } else {
      // Background generation failed or was never initiated; launch synthesis now
      pendingAdvanceRef.current = true;
      const prevQ = quizState.question;
      const votes = quizState.votesDistribution || { A: 0, B: 0, C: 0, D: 0 };
      const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
      const correctOpt = prevQ?.correctOptionId;
      const correctVotes = correctOpt ? votes[correctOpt] || 0 : 0;
      const accuracyPct = totalVotes > 0 ? (correctVotes / totalVotes) * 100 : 50;

      const { targetTier, adaptationType } = calculateNextDifficulty(camp.currentDifficulty, accuracyPct);
      const nextQNum = camp.currentQuestionIndex + 1;

      generateAdaptiveFollowUpQuestion({
        topic: camp.topic,
        currentDifficulty: camp.currentDifficulty,
        targetDifficulty: targetTier,
        previousQuestion: prevQ?.question,
        previousCorrectAnswer: prevQ?.expectedAnswer || prevQ?.options?.find((o) => o.id === correctOpt)?.text,
        accuracyPct,
        questionNumber: nextQNum,
        totalQuestions: camp.totalQuestions,
        adaptationType,
        format: camp.format || 'mixed',
      })
        .then((nextQ) => {
          pendingAdvanceRef.current = false;
          launchNextAdaptiveQuestion(nextQ);
        })
        .catch((err) => {
          console.error('[AdaptiveQuiz] Emergency advance synthesis failed:', err);
          pendingAdvanceRef.current = false;
          if (onAutoAdvanceRef.current) {
            onAutoAdvanceRef.current();
          }
        });
    }
  }, [
    userRole,
    quizState.question,
    quizState.votesDistribution,
    quizState.isAIGeneratingNext,
    adaptiveCampaignStorageKey,
    launchNextAdaptiveQuestion,
  ]);

  const revealAnswer = useCallback(() => {
    const campaign = adaptiveCampaignRef.current;
    const hasFollowUp = campaign && campaign.isActive && campaign.currentQuestionIndex < campaign.totalQuestions;
    hasAutoAdvancedRef.current = false;

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
        dbUpdateQuizRoundReveal(prev.question.id, autoAdvanceAt);
        dbSaveActiveQuizRound(updated, currentRoomKey);
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
        previousCorrectAnswer: prevQ.expectedAnswer || prevQ.options?.find((o) => o.id === correctOpt)?.text,
        accuracyPct,
        questionNumber: nextQNum,
        totalQuestions: campaign.totalQuestions,
        adaptationType,
        format: campaign.format || 'mixed',
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
          pendingAdvanceRef.current = false;
          const curCamp = adaptiveCampaignRef.current;
          if (curCamp && curCamp.isActive) {
            const nextCamp: AdaptiveCampaignState = {
              ...curCamp,
              isGeneratingNext: false,
            };
            setAdaptiveCampaign(nextCamp);
            adaptiveCampaignRef.current = nextCamp;
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
    currentRoomKey,
  ]);

  const toggleAutoAdvance = useCallback(
    (forced?: boolean) => {
      if (userRole !== 'host') return;
      setIsAutoAdvanceEnabled((prev) => {
        const next = typeof forced === 'boolean' ? forced : !prev;
        try {
          localStorage.setItem(autoAdvanceStorageKey, JSON.stringify(next));
          localStorage.setItem('sketchcast_host_autoadvance', JSON.stringify(next));
        } catch {
          // ignore
        }

        if (next) {
          hasAutoAdvancedRef.current = false;
        }

        // If toggling while a question is currently revealed:
        setQuizState((currentState) => {
          if (!currentState.isRevealed) return currentState;
          const autoAdvanceAt = next ? Date.now() + 5000 : null;
          const updated: QuizRoundState = {
            ...currentState,
            autoAdvanceAt,
            isAutoAdvancePaused: false,
            autoAdvanceRemaining: next ? 5 : 0,
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
          if (currentState.question) {
            dbUpdateQuizRoundReveal(currentState.question.id, autoAdvanceAt);
            dbSaveActiveQuizRound(updated, currentRoomKey);
          }
          return updated;
        });

        return next;
      });
    },
    [userRole, autoAdvanceStorageKey, quizStorageKey, channelManager, currentRoomKey]
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
      if (prev.question) {
        dbSaveActiveQuizRound(updated, currentRoomKey);
      }
      return updated;
    });
  }, [userRole, quizStorageKey, channelManager, currentRoomKey]);

  const resumeAutoAdvance = useCallback(() => {
    if (userRole !== 'host') return;
    hasAutoAdvancedRef.current = false;
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
      if (prev.question) {
        dbUpdateQuizRoundReveal(prev.question.id, autoAdvanceAt);
        dbSaveActiveQuizRound(updated, currentRoomKey);
      }
      return updated;
    });
  }, [userRole, quizStorageKey, channelManager, currentRoomKey]);

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

  // Self-healing: If host has auto-advance enabled on an active revealed round, ensure autoAdvanceAt is scheduled
  useEffect(() => {
    if (
      userRole === 'host' &&
      isAutoAdvanceEnabled &&
      quizState.isActive &&
      quizState.isRevealed &&
      !quizState.autoAdvanceAt &&
      !quizState.isAutoAdvancePaused &&
      !hasAutoAdvancedRef.current
    ) {
      const autoAdvanceAt = Date.now() + 5000;
      setQuizState((prev) => {
        if (!prev.isActive || !prev.isRevealed || prev.autoAdvanceAt || prev.isAutoAdvancePaused) {
          return prev;
        }
        const updated: QuizRoundState = {
          ...prev,
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
        if (prev.question) {
          dbUpdateQuizRoundReveal(prev.question.id, autoAdvanceAt);
          dbSaveActiveQuizRound(updated, currentRoomKey);
        }
        return updated;
      });
    }
  }, [
    userRole,
    isAutoAdvanceEnabled,
    quizState.isActive,
    quizState.isRevealed,
    quizState.autoAdvanceAt,
    quizState.isAutoAdvancePaused,
    quizStorageKey,
    channelManager,
    currentRoomKey,
  ]);

  // Auto-advance review countdown effect (5 seconds after reveal)
  useEffect(() => {
    if (quizState.isActive && quizState.isRevealed) {
      if (quizState.isAutoAdvancePaused) {
        if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
        const rem = quizState.autoAdvanceRemaining ?? 5;
        queueMicrotask(() => setAutoAdvanceCountdown(rem));
        return;
      }

      if (quizState.autoAdvanceAt) {
        // If the timestamp is far in the past (>15s ago, e.g. from an old page reload), reschedule fresh 5s window
        if (
          quizState.autoAdvanceAt < Date.now() - 15000 &&
          !hasAutoAdvancedRef.current &&
          userRole === 'host' &&
          isAutoAdvanceEnabled
        ) {
          const freshAdvanceAt = Date.now() + 5000;
          setQuizState((prev) => {
            const next = { ...prev, autoAdvanceAt: freshAdvanceAt, updatedAt: Date.now() };
            if (prev.question) {
              dbUpdateQuizRoundReveal(prev.question.id, freshAdvanceAt);
              dbSaveActiveQuizRound(next, currentRoomKey);
            }
            if (channelManager) {
              channelManager.broadcast('quiz_round_state', next);
            }
            return next;
          });
          return;
        }

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
        queueMicrotask(() => setAutoAdvanceCountdown(0));
      }
    } else {
      hasAutoAdvancedRef.current = false;
      queueMicrotask(() => setAutoAdvanceCountdown(5));
    }
  }, [
    quizState.isActive,
    quizState.isRevealed,
    quizState.autoAdvanceAt,
    quizState.isAutoAdvancePaused,
    quizState.autoAdvanceRemaining,
    userRole,
    isAutoAdvanceEnabled,
    adaptiveCampaignStorageKey,
    launchNextAdaptiveQuestion,
    currentRoomKey,
    channelManager,
  ]);

  const selectOption = useCallback(
    (optionId: string) => {
      if (!quizState.isActive || quizState.isRevealed || quizState.userSelectedOption) {
        return;
      }

      votedUsersRef.current.add(sessionId);

      const isCorrect = quizState.question?.correctOptionId === optionId;

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
      }

      // High-speed fire-and-forget broadcast (<15ms) - Zero DB row lock contention
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
      quizStorageKey,
      quizAnswersStorageKey,
      channelManager,
    ]
  );

  // High-concurrency leaderboard score award on reveal (Zero-lock during active round)
  useEffect(() => {
    if (quizState.isActive && quizState.isRevealed && quizState.question && quizState.userSelectedOption) {
      const qId = quizState.question.id;
      if (recordedRoundScoreRef.current === qId) return;
      recordedRoundScoreRef.current = qId;

      const isCorrect = quizState.userSelectedOption === quizState.question.correctOptionId;
      if (isCorrect) {
        queueMicrotask(() => {
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
        });
      }
    }
  }, [
    quizState.isActive,
    quizState.isRevealed,
    quizState.question,
    quizState.userSelectedOption,
    sessionId,
    userName,
    userRole,
    currentRoomKey,
    channelManager,
  ]);

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

  const clearActiveQuizRound = useCallback(
    (options?: { isFinished?: boolean }) => {
      votedUsersRef.current.clear();
      hasAutoAdvancedRef.current = false;
      pendingAdvanceRef.current = false;
      setAutoAdvanceCountdown(5);

      setAdaptiveCampaign(null);
      adaptiveCampaignRef.current = null;
      try {
        localStorage.removeItem(adaptiveCampaignStorageKey);
      } catch {
        // ignore
      }

      const clearedState: QuizRoundState = {
        isActive: false,
        question: null,
        endTime: null,
        totalSeconds: 25,
        isRevealed: false,
        userSelectedOption: null,
        isCorrect: null,
        votesDistribution: { A: 0, B: 0, C: 0, D: 0 },
        autoAdvanceAt: null,
        isAutoAdvancePaused: false,
        autoAdvanceRemaining: 0,
        isQuizFinished: options?.isFinished ?? false,
        updatedAt: Date.now(),
      };

      setQuizState(clearedState);
      setTimeRemaining(0);

      try {
        localStorage.setItem(quizStorageKey, JSON.stringify(clearedState));
      } catch {
        // ignore
      }

      // Persist deactivation in Supabase
      dbClearActiveQuizRound(currentRoomKey);

      // Broadcast cleared state to all peers
      if (channelManager) {
        channelManager.broadcast('quiz_round_state', clearedState);
      }
    },
    [channelManager, currentRoomKey, quizStorageKey, adaptiveCampaignStorageKey]
  );

  return {
    quizState,
    leaderboard,
    timeRemaining,
    userQuizAnswers,
    startQuizRound,
    revealAnswer,
    clearActiveQuizRound,
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
