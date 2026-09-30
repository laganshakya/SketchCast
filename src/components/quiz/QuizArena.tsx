import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Eye,
  Trophy,
  Play,
  Pause,
  Zap,
  Flame,
  RefreshCw,
  Clock,
  Lightbulb,
  Vote,
  Terminal,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { QuizRoundState, QuizQuestion, QuizOption, SponsorCTA } from '../../types';
import { gradeShortAnswerWithJev } from '../../lib/meshApi';
import {
  playPopSound,
  playClickSound,
  playSuccessFanfare,
  playErrorBuzz,
  playCountdownTick,
} from '../../lib/soundFx';
import { RollingCounter } from '../common/RollingCounter';
import { ContextualAffiliateCard } from '../affiliate/ContextualAffiliateCard';
import { useAffiliateRecommendation } from '../../hooks/useAffiliateRecommendation';

interface QuizArenaProps {
  quizState: QuizRoundState;
  timeRemaining: number;
  onSelectOption: (optionId: string) => void;
  onSubmitShortAnswer?: (answer: string, isCorrect: boolean) => void;
  onRevealAnswer: () => void;
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  onViewScores?: () => void;
  isHost: boolean;
  autoAdvanceCountdown?: number;
  isAutoAdvanceEnabled?: boolean;
  isAutoAdvancePaused?: boolean;
  onToggleAutoAdvance?: () => void;
  onPauseAutoAdvance?: () => void;
  onResumeAutoAdvance?: () => void;
  onExtendTime?: (additionalSeconds: number) => void;
  onLaunchRemediationPoll?: (params: {
    question: QuizQuestion;
    mostPickedWrong?: QuizOption;
    votesDistribution: Record<string, number>;
  }) => Promise<void> | void;
  onClearActiveQuiz?: () => void;
  roomCode?: string;
  roomTitle?: string;
  sponsorCTA?: SponsorCTA | null;
}

/**
 * Formats question and option text, highlighting inline code backticks with monospace styling
 * for enhanced technical legibility in Studio Noma style.
 */
const renderFormattedText = (text: string) => {
  if (!text) return null;
  if (text.includes('`')) {
    const segments = text.split(/(`[^`]+`)/g).map((raw, pos) => ({
      raw,
      key: `seg_${pos}_${raw.slice(0, 12)}`,
      isCode: raw.startsWith('`') && raw.endsWith('`') && raw.length > 2,
    }));
    return segments.map((seg) => {
      if (seg.isCode) {
        return (
          <code
            key={seg.key}
            className="px-2 py-0.5 mx-0.5 rounded-lg bg-[#101313] dark:bg-[#141818] text-lime dark:text-[#d7ff2f] font-mono text-[0.88em] font-semibold border border-black/30 dark:border-white/10 shadow-2xs"
          >
            {seg.raw.slice(1, -1)}
          </code>
        );
      }
      return seg.raw;
    });
  }
  return text;
};

export const QuizArena: React.FC<QuizArenaProps> = ({
  quizState,
  timeRemaining,
  onSelectOption,
  onSubmitShortAnswer,
  onRevealAnswer,
  onNextQuestion,
  hasNextQuestion = false,
  onViewScores,
  isHost,
  autoAdvanceCountdown = 5,
  isAutoAdvanceEnabled = true,
  isAutoAdvancePaused = false,
  onToggleAutoAdvance,
  onPauseAutoAdvance,
  onResumeAutoAdvance,
  onExtendTime,
  onLaunchRemediationPoll,
  onClearActiveQuiz,
  roomCode,
  roomTitle,
  sponsorCTA,
}) => {
  const {
    question,
    isRevealed,
    userSelectedOption,
    isCorrect,
    votesDistribution,
  } = quizState;

  const isPaused = Boolean(isAutoAdvancePaused || quizState.isAutoAdvancePaused);
  const totalVotes = Object.values(votesDistribution || {}).reduce((a, b) => a + b, 0);

  // Short Answer state
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [isGradingShortAnswer, setIsGradingShortAnswer] = useState(false);
  const [shortAnswerGradeResult, setShortAnswerGradeResult] = useState<{
    isCorrect: boolean;
    confidence: number;
    feedback?: string;
  } | null>(null);

  // Remediation Poll generation state
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);

  // Reset states on question change
  const prevQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (question && question.id !== prevQuestionIdRef.current) {
      prevQuestionIdRef.current = question.id;
      setShortAnswerInput('');
      setIsGradingShortAnswer(false);
      setShortAnswerGradeResult(null);
      setIsGeneratingRemediation(false);
    }
  }, [question]);

  const handleShortAnswerSubmit = async () => {
    if (!question || !shortAnswerInput.trim() || isGradingShortAnswer || isRevealed) return;
    setIsGradingShortAnswer(true);
    playPopSound();

    const correctId = question.correctOptionId || 'A';
    const wrongId = (question.options?.find((o) => o.id !== correctId)?.id) || (correctId === 'A' ? 'B' : 'A');

    try {
      const result = await gradeShortAnswerWithJev({
        question: question.question,
        expectedAnswer: question.expectedAnswer || question.correctOptionId || '',
        attendeeAnswer: shortAnswerInput.trim(),
        acceptableAnswers: question.acceptableAnswers,
      });

      setShortAnswerGradeResult(result);
      if (result.isCorrect) {
        playSuccessFanfare();
        onSelectOption(correctId); // Count as correct
      } else {
        playErrorBuzz();
        onSelectOption(wrongId); // Count as incorrect
      }
      onSubmitShortAnswer?.(shortAnswerInput.trim(), result.isCorrect);
    } catch (err) {
      console.warn('[QuizArena] Jev grading error, falling back to heuristic:', err);
      const cleanSub = shortAnswerInput.trim().toLowerCase();
      const cleanExp = (question.expectedAnswer || question.correctOptionId || '').trim().toLowerCase();
      const isMatch = cleanSub.length > 0 && (
        cleanSub === cleanExp ||
        (question.acceptableAnswers || []).some((ans) => ans.trim().toLowerCase() === cleanSub) ||
        (cleanSub.length >= 3 && cleanExp.includes(cleanSub))
      );
      const fallbackResult = {
        isCorrect: isMatch,
        confidence: isMatch ? 0.8 : 0.2,
        feedback: isMatch ? 'Matched ground truth via local fallback.' : 'Concept did not match expected answer.',
      };
      setShortAnswerGradeResult(fallbackResult);
      if (isMatch) {
        playSuccessFanfare();
        onSelectOption(correctId);
      } else {
        playErrorBuzz();
        onSelectOption(wrongId);
      }
      onSubmitShortAnswer?.(shortAnswerInput.trim(), isMatch);
    } finally {
      setIsGradingShortAnswer(false);
    }
  };

  const correctCount = question ? votesDistribution[question.correctOptionId] || 0 : 0;
  const failureCount = totalVotes - correctCount;
  const failurePct = totalVotes > 0 ? Math.round((failureCount / totalVotes) * 100) : 0;
  const isHighMisconception = Boolean(isRevealed && isHost && totalVotes >= 2 && (failurePct >= 50 || failureCount >= 2));

  const wrongOptions = question?.options ? question.options.filter((o) => o.id !== question.correctOptionId) : [];
  const mostPickedWrong = wrongOptions.length > 0
    ? [...wrongOptions].sort((a, b) => (votesDistribution[b.id] || 0) - (votesDistribution[a.id] || 0))[0]
    : undefined;

  const affiliateRec = useAffiliateRecommendation({
    placement: 'quiz_takeaway',
    question,
    accuracyPct: totalVotes > 0 ? Math.round((correctCount / totalVotes) * 100) : undefined,
    roomTitle,
    roomCode,
    sponsorCTA,
  });

  const lastRemainingRef = useRef<number>(timeRemaining);
  const hasPlayedRevealRef = useRef<boolean>(false);

  // Play countdown ticks in final 5 seconds of active round
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0 && !isRevealed && question) {
      if (lastRemainingRef.current !== timeRemaining) {
        playCountdownTick(timeRemaining);
      }
    }
    lastRemainingRef.current = timeRemaining;
  }, [timeRemaining, isRevealed, question]);

  // Play celebratory fanfare or buzzer on answer reveal
  useEffect(() => {
    if (isRevealed && !hasPlayedRevealRef.current && question) {
      hasPlayedRevealRef.current = true;
      if (userSelectedOption) {
        if (isCorrect) {
          playSuccessFanfare();
        } else {
          playErrorBuzz();
        }
      }
    } else if (!isRevealed) {
      hasPlayedRevealRef.current = false;
    }
  }, [isRevealed, isCorrect, userSelectedOption, question]);

  if (!question || !quizState.isActive || quizState.isQuizFinished) {
    if (quizState.isQuizFinished) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper text-ink font-sans">
          <div className="w-16 h-16 rounded-3xl bg-lime/30 text-ink border border-lime flex items-center justify-center mb-4 shadow-sm">
            <Trophy className="w-8 h-8 text-ink" />
          </div>
          <div className="text-xs font-mono tracking-widest text-orange uppercase font-bold mb-1">
            ROUND CONCLUDED
          </div>
          <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink uppercase tracking-tight mb-3">
            QUIZ SESSION COMPLETED
          </h3>
          <p className="text-sm font-sans text-muted max-w-md bg-paper-elevated p-5 rounded-2xl border border-hairline leading-relaxed mb-6">
            All questions for this session have been resolved! Check the leaderboard to see final standings, scores, and celebratory certificates.
          </p>
          <div className="flex items-center gap-3">
            {onViewScores && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  onViewScores();
                }}
                className="px-6 py-3 btn-noma-orange font-mono text-xs font-bold uppercase rounded-xl flex items-center space-x-2 cursor-pointer shadow-sm"
              >
                <Trophy className="w-4 h-4" />
                <span>VIEW LEADERBOARD</span>
              </motion.button>
            )}
            {isHost && onClearActiveQuiz && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  onClearActiveQuiz();
                }}
                className="px-5 py-3 bg-paper-card hover:bg-black/[0.04] text-ink border border-hairline font-mono text-xs font-bold uppercase rounded-xl flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-muted" />
                <span>NEW SESSION</span>
              </motion.button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-paper text-ink font-sans">
        <div className="w-16 h-16 rounded-3xl bg-paper-elevated text-orange border border-hairline flex items-center justify-center mb-4 shadow-xs">
          <Sparkles className="w-7 h-7 text-orange" />
        </div>
        <div className="text-xs font-mono tracking-widest text-orange uppercase font-bold mb-1">
          ARENA STANDBY
        </div>
        <h3 className="text-3xl sm:text-4xl font-serif font-bold text-ink uppercase tracking-tight mb-3">
          NO ACTIVE QUIZ ROUND
        </h3>
        <p className="text-sm font-sans text-muted max-w-md bg-paper-elevated p-5 rounded-2xl border border-hairline leading-relaxed">
          {isHost
            ? 'Launch a challenge from the host control console to begin the live round.'
            : 'Standing by. The keynote host is queuing the next architecture challenge...'}
        </p>
      </div>
    );
  }

  const getOptionButtonClass = (optionId: string) => {
    const isSelected = userSelectedOption === optionId;
    const isAnswer = question.correctOptionId === optionId;

    if (isRevealed) {
      if (isAnswer) {
        return 'bg-lime/25 text-ink border-2 border-lime shadow-xs font-bold';
      }
      if (isSelected && !isAnswer) {
        return 'bg-orange/15 text-orange border-2 border-orange shadow-xs font-bold';
      }
      return 'bg-paper-card text-muted/50 border border-hairline opacity-50';
    }

    if (isSelected) {
      return 'bg-ink text-paper border-2 border-ink shadow-sm font-bold';
    }

    return 'bg-paper-elevated hover:bg-black/[0.03] text-ink border border-hairline hover:border-ink shadow-xs';
  };

  const getOptionBadgeClass = (optionId: string) => {
    const isSelected = userSelectedOption === optionId;
    const isAnswer = question.correctOptionId === optionId;

    if (isRevealed) {
      if (isAnswer) return 'bg-lime text-ink border-lime font-bold';
      if (isSelected && !isAnswer) return 'bg-orange text-white border-orange font-bold';
    }
    if (isSelected) return 'bg-lime text-ink border-lime font-bold';
    return 'bg-paper-card text-muted border-hairline';
  };

  const timerPercentage = Math.max(0, (timeRemaining / (quizState.totalSeconds || 25)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-3 sm:p-5 md:p-6 space-y-4 font-sans text-ink"
    >
      {/* Clean Top Status Bar */}
      <div className="bg-paper-elevated border border-hairline rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-wrap gap-y-1">
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-2 h-2 rounded-full ${quizState.isAdaptiveCampaign ? 'bg-lime animate-ping' : 'bg-orange animate-pulse'}`} />
            <span className="text-orange font-bold text-xs tracking-wider uppercase">
              {quizState.isAdaptiveCampaign ? 'ADAPTIVE ARENA' : 'LIVE ARENA'}
            </span>
          </div>
          <span className="text-muted/40 hidden xs:inline">/</span>
          <span className="text-ink text-xs font-bold truncate uppercase tracking-wider max-w-[150px] sm:max-w-none">
            {question.category.replace(/_/g, ' ')}
          </span>
          {question.difficultyTier && (
            <>
              <span className="text-muted/40 hidden sm:inline">/</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-paper-card border border-hairline text-[10px] font-bold text-ink uppercase tracking-wider">
                {question.difficultyTier} TIER
              </span>
            </>
          )}
          {quizState.adaptiveProgress && (
            <>
              <span className="text-muted/40 hidden sm:inline">/</span>
              <span className="text-orange text-[10px] sm:text-xs font-bold tracking-wider">
                ROUND {quizState.adaptiveProgress.current} OF {quizState.adaptiveProgress.total}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs shrink-0">
          <span className="text-muted">
            STATUS: <span className="text-ink font-bold">{isRevealed ? 'RESOLVED' : 'ACTIVE'}</span>
          </span>
          <span className="text-muted/40">/</span>
          <span className="text-muted">
            VOTES: <span className="text-orange font-bold">{totalVotes}</span>
          </span>
        </div>
      </div>

      {/* Editorial Countdown & Progress Section */}
      <div className="bg-paper-elevated border border-hairline rounded-3xl p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold">
            {isRevealed ? (quizState.autoAdvanceAt ? 'AUTO-ADVANCE' : 'ROUND STATUS') : 'ROUND TIMER'}
          </div>
          <div className="flex items-baseline space-x-3 flex-wrap">
            <div className="font-timer text-5xl sm:text-7xl font-black tracking-tight text-ink">
              {!isRevealed ? (
                <RollingCounter value={timeRemaining} padZero={true} />
              ) : quizState.autoAdvanceAt ? (
                quizState.isAIGeneratingNext && autoAdvanceCountdown === 0 ? (
                  <span className="text-orange text-3xl sm:text-4xl font-mono tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-orange shrink-0" />
                    SYNTHESIZING
                  </span>
                ) : isPaused ? (
                  <span className="text-orange text-3xl sm:text-4xl md:text-5xl font-mono tracking-tight flex items-center gap-2">
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 inline-block animate-pulse text-orange" />
                    PAUSED
                  </span>
                ) : (
                  <span className="text-orange">
                    <RollingCounter value={autoAdvanceCountdown} padZero={true} />
                  </span>
                )
              ) : (
                <span className="text-ink text-3xl sm:text-4xl md:text-5xl font-mono tracking-tight">
                  RESOLVED
                </span>
              )}
            </div>
            {!isRevealed ? (
              <span className="font-mono text-xs sm:text-sm font-bold text-muted uppercase tracking-wider">
                SECONDS REMAINING
              </span>
            ) : quizState.autoAdvanceAt ? (
              <span className="font-mono text-xs sm:text-sm font-bold text-muted uppercase tracking-wider">
                {quizState.isAIGeneratingNext && autoAdvanceCountdown === 0
                  ? 'ADAPTING NEXT CHALLENGE TO ROOM ACCURACY...'
                  : isPaused
                  ? `HOLDING AT ${autoAdvanceCountdown}S`
                  : hasNextQuestion
                  ? 'SECONDS TO NEXT QUESTION'
                  : 'SECONDS TO LEADERBOARD'}
              </span>
            ) : null}
          </div>
        </div>

        {/* Minimal Progress Track */}
        <div className="sm:w-64 w-full space-y-2 self-end sm:self-center">
          {!isRevealed ? (
            <>
              <div className="flex justify-between text-xs font-mono text-muted">
                <span>TIME REMAINING</span>
                <span className={timeRemaining <= 5 ? 'text-orange font-bold' : 'text-ink font-bold'}>
                  {Math.round(timerPercentage)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-paper-card rounded-full border border-hairline overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeRemaining <= 5 ? 'bg-orange' : 'bg-ink'}`}
                  style={{ width: `${timerPercentage}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </>
          ) : quizState.autoAdvanceAt ? (
            <>
              <div className="flex justify-between text-xs font-mono text-muted">
                <span>TRANSITION</span>
                <span className={isPaused ? 'text-orange font-bold' : 'text-ink font-bold'}>
                  {isPaused ? 'PAUSED' : `${autoAdvanceCountdown}S`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-paper-card rounded-full border border-hairline overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isPaused ? 'bg-orange' : 'bg-lime'}`}
                  style={{ width: `${Math.max(0, Math.min(100, (autoAdvanceCountdown / 5) * 100))}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Question Prompt Card with Editorial Typographic Scale */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-paper-elevated p-6 sm:p-8 rounded-3xl border border-hairline shadow-sm relative text-ink"
      >
        <div className="text-xs font-mono tracking-widest text-orange uppercase font-bold mb-3 flex items-center justify-between flex-wrap gap-1">
          <span>CHALLENGE QUESTION</span>
          {question.difficultyTier && (
            <span className="text-muted font-normal text-xs">
              DIFFICULTY: <span className="text-ink font-bold">{question.difficultyTier}</span>
            </span>
          )}
        </div>

        {/* Adaptive Dynamic Gamification Banner */}
        {question.adaptiveMeta && (
          question.adaptiveMeta.adaptationType === 'level_up' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-4 px-3.5 py-2.5 rounded-2xl bg-orange/15 border border-orange/30 text-orange text-xs flex items-center justify-between gap-3 overflow-hidden shadow-xs"
            >
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Flame className="w-4 h-4 text-orange animate-pulse shrink-0" />
                <span className="font-extrabold tracking-wide uppercase text-ink shrink-0">
                  LEVEL UP!
                </span>
                <span className="text-orange font-bold tracking-wide uppercase shrink-0">
                  • PREV. ACCURACY: {Math.round(question.adaptiveMeta.previousAccuracy ?? 0)}%
                </span>
                <span className="text-muted text-xs truncate hidden md:inline">
                  — Elevating challenge to deeper architectural edge cases
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-orange text-white font-mono text-[10px] font-bold tracking-wider uppercase shrink-0">
                {question.difficultyTier || 'Senior'} TIER
              </span>
            </motion.div>
          ) : question.adaptiveMeta.adaptationType === 'stepped_down' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-4 px-3.5 py-2.5 rounded-2xl bg-lime/20 border border-lime text-ink text-xs flex items-center justify-between gap-3 overflow-hidden shadow-xs"
            >
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-ink shrink-0" />
                <span className="font-extrabold tracking-wide uppercase text-ink shrink-0">
                  FOUNDATION CHECK
                </span>
                <span className="text-ink font-bold tracking-wide uppercase shrink-0">
                  • PREV. ACCURACY: {Math.round(question.adaptiveMeta.previousAccuracy ?? 0)}%
                </span>
                <span className="text-muted text-xs truncate hidden md:inline">
                  — Re-anchoring core mental models & essentials
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-black/20 dark:border-lime/30 font-mono text-[10px] font-bold tracking-wider uppercase shrink-0">
                {question.difficultyTier || 'Junior'} TIER
              </span>
            </motion.div>
          ) : (
            <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-paper-card border border-hairline text-ink text-xs flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Zap className="w-4 h-4 text-orange shrink-0" />
                <span className="font-bold tracking-wide uppercase text-ink truncate">
                  {question.adaptiveMeta.questionNumber === 1
                    ? `ADAPTIVE JOURNEY: CHALLENGE 1 OF ${question.adaptiveMeta.totalQuestions}`
                    : `STEADY PACE: MAINTAINING ${question.difficultyTier || 'Senior'} TIER`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-paper border border-hairline text-ink font-mono text-[10px] font-bold tracking-wider uppercase shrink-0">
                {question.difficultyTier || 'Senior'} TIER
              </span>
            </div>
          )
        )}

        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-ink leading-tight tracking-tight">
          {renderFormattedText(question.question)}
        </h2>
      </motion.div>

      {/* Short Answer Mode or Multiple Choice Cards */}
      {question.questionType === 'short_answer' ? (
        <div className="p-6 sm:p-7 bg-paper-elevated border border-hairline rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-orange font-bold uppercase flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              <span>Freeform Technical Short Answer</span>
            </span>
            <span className="text-[11px] text-muted">
              ⚡ Evaluated by TypeSafe Jev-1.13 in ~150ms
            </span>
          </div>

          {/* Interactive Short Answer Input & Evaluation */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={shortAnswerInput}
                onChange={(e) => setShortAnswerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleShortAnswerSubmit();
                  }
                }}
                disabled={isRevealed || userSelectedOption !== null || isGradingShortAnswer}
                placeholder={
                  isHost
                    ? "Test your answer here with TypeSafe Jev-1.13..."
                    : "Type your exact command, concept, or technical answer..."
                }
                className="w-full px-4 py-3.5 bg-paper border border-hairline rounded-2xl text-ink font-mono text-sm focus:outline-none focus:border-ink disabled:opacity-60 placeholder:text-muted/60"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {shortAnswerGradeResult ? (
                  <span
                    className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                      shortAnswerGradeResult.isCorrect
                        ? 'bg-lime/30 text-ink border border-lime'
                        : 'bg-orange/15 text-orange border border-orange/30'
                    }`}
                  >
                    {shortAnswerGradeResult.isCorrect ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Correct! Jev score: {Math.round(shortAnswerGradeResult.confidence * 100)}%</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Incorrect answer</span>
                      </>
                    )}
                  </span>
                ) : userSelectedOption ? (
                  <span
                    className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                      userSelectedOption === (question.correctOptionId || 'A')
                        ? 'bg-lime/30 text-ink border border-lime'
                        : 'bg-orange/15 text-orange border border-orange/30'
                    }`}
                  >
                    {userSelectedOption === (question.correctOptionId || 'A') ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Submitted (Correct)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Submitted (Incorrect)</span>
                      </>
                    )}
                  </span>
                ) : isRevealed ? (
                  <span className="px-3.5 py-1.5 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 bg-paper-card text-muted border border-hairline">
                    <Clock className="w-4 h-4" />
                    <span>Time expired</span>
                  </span>
                ) : null}
              </div>

              {!userSelectedOption && !isRevealed && (
                <button
                  type="button"
                  onClick={handleShortAnswerSubmit}
                  disabled={!shortAnswerInput.trim() || isGradingShortAnswer}
                  className="px-5 py-2.5 btn-noma-orange font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isGradingShortAnswer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <span>{isHost ? 'Test / Submit Answer' : 'Submit Answer'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {isHost && (
            <div className="p-4 bg-paper-card border border-hairline rounded-2xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted uppercase text-[10px] font-bold">Host Ground Truth Reference:</span>
                <span className="text-[10px] text-muted">Live Correct: {correctCount} / {totalVotes}</span>
              </div>
              <div className="text-ink font-semibold flex items-center gap-2 flex-wrap">
                <span>Expected:</span>
                <code className="text-ink bg-lime/30 px-2 py-0.5 rounded-md border border-lime">
                  {question.expectedAnswer || question.correctOptionId}
                </code>
                {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
                  <span className="text-muted text-[11px]">
                    (Synonyms: {question.acceptableAnswers.join(', ')})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4 Precision Option Cards (A, B, C, D) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {(question.options || []).map((option) => {
            const voteCount = votesDistribution[option.id] || 0;
            const votePct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userSelectedOption === option.id;
            const isAnswer = question.correctOptionId === option.id;
            const isDisabled = isRevealed || userSelectedOption !== null;

            return (
              <motion.button
                key={option.id}
                whileTap={isDisabled ? {} : { scale: 0.98 }}
                onClick={() => {
                  if (!isDisabled) {
                    playPopSound();
                    onSelectOption(option.id);
                  }
                }}
                disabled={isDisabled}
                className={`p-4 sm:p-5 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[88px] sm:min-h-[104px] cursor-pointer ${getOptionButtonClass(
                  option.id
                )}`}
              >
                {/* Fill bar for vote counts */}
                {(isRevealed || isHost) && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${
                      isAnswer ? 'bg-lime' : isSelected ? 'bg-orange' : 'bg-ink'
                    }`}
                    style={{ width: `${votePct}%` }}
                  />
                )}

                <div className="flex items-start justify-between relative z-10 gap-3 mb-2 w-full min-w-0">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 rounded-xl font-mono text-xs flex items-center justify-center border shrink-0 font-bold ${getOptionBadgeClass(
                        option.id
                      )}`}
                    >
                      {option.id}
                    </span>
                    <span
                      className={`text-sm md:text-base font-semibold leading-relaxed tracking-normal font-sans break-words ${
                        isSelected && !isRevealed
                          ? 'text-paper'
                          : isRevealed
                          ? isAnswer
                            ? 'text-ink'
                            : isSelected
                            ? 'text-orange'
                            : 'text-muted'
                          : 'text-ink'
                      }`}
                    >
                      {renderFormattedText(option.text)}
                    </span>
                  </div>

                  {isRevealed && isAnswer && (
                    <CheckCircle className="w-5 h-5 text-ink stroke-[2.2] shrink-0" />
                  )}
                  {isRevealed && isSelected && !isAnswer && (
                    <XCircle className="w-5 h-5 text-orange stroke-[2.2] shrink-0" />
                  )}
                </div>

                {/* Vote statistics */}
                {(isRevealed || isHost) && (
                  <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-hairline relative z-10 text-muted">
                    <span>{voteCount} VOTES</span>
                    <span className="font-bold text-ink">{votePct}%</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Result & Explanation Card */}
      {isRevealed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-paper-elevated border border-hairline rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm text-ink"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {userSelectedOption ? (
                isCorrect ? (
                  <span className="px-3.5 py-1.5 rounded-full bg-lime/30 text-ink font-mono font-bold text-xs uppercase border border-lime flex items-center gap-1.5 shadow-xs">
                    <CheckCircle className="w-4 h-4 stroke-[2]" />
                    <span>CORRECT ANSWER</span>
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-full bg-orange/15 text-orange font-mono font-bold text-xs uppercase border border-orange/30 flex items-center gap-1.5 shadow-xs">
                    <XCircle className="w-4 h-4 stroke-[2]" />
                    <span>INCORRECT ANSWER</span>
                  </span>
                )
              ) : (
                <span className="px-3.5 py-1.5 rounded-full bg-paper-card text-muted font-mono font-bold text-xs uppercase border border-hairline">
                  ROUND RESOLVED
                </span>
              )}
            </div>

            <div className="font-mono font-bold text-xs uppercase bg-paper-card text-ink px-3.5 py-1.5 rounded-full border border-hairline">
              {question.questionType === 'short_answer' ? (
                <>
                  CORRECT ANSWER:{' '}
                  <span className="text-orange font-mono">[{question.expectedAnswer || question.correctOptionId}]</span>
                </>
              ) : (
                <>
                  CORRECT OPTION: <span className="text-orange">[{question.correctOptionId}]</span>
                </>
              )}
            </div>
          </div>

          {/* Architectural Explanation */}
          <div className="p-5 bg-paper-card rounded-2xl border border-hairline font-sans text-sm text-ink/90 leading-relaxed">
            <div className="flex items-center space-x-1.5 font-mono font-bold uppercase text-xs mb-2 text-orange">
              <HelpCircle className="w-4 h-4 stroke-[2]" />
              <span>KEY TAKEAWAY</span>
            </div>
            <p className="font-normal font-sans leading-relaxed">{renderFormattedText(question.explanation)}</p>
            {question.questionType === 'short_answer' && question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-hairline text-xs font-mono text-muted flex items-center gap-1.5 flex-wrap">
                <span className="font-bold uppercase text-[10px] text-muted">Also Accepted:</span>
                {question.acceptableAnswers.map((syn) => (
                  <span key={`${question.id}-${syn}`} className="px-2 py-0.5 rounded-md bg-paper border border-hairline text-ink text-[11px] font-bold">
                    {syn}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Contextual Affiliate & Partner Learning Recommendation */}
          {isRevealed && affiliateRec && (
            <ContextualAffiliateCard recommendation={affiliateRec} />
          )}

          {/* Smart Remediation Poll Trigger for Host */}
          {isHighMisconception && onLaunchRemediationPoll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 bg-orange/10 border-2 border-orange/40 rounded-2xl flex items-center justify-between flex-wrap gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-orange/20 text-orange shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-orange uppercase tracking-wider font-mono">
                    High Misconception Detected ({failurePct}% Incorrect)
                  </div>
                  <p className="text-xs text-ink/80 font-sans mt-0.5">
                    {mostPickedWrong && (votesDistribution[mostPickedWrong.id] || 0) > 0
                      ? `${Math.round(((votesDistribution[mostPickedWrong.id] || 0) / totalVotes) * 100)}% of attendees selected [${mostPickedWrong.id}] "${mostPickedWrong.text.slice(0, 45)}...". Launch a remediation poll to clarify.`
                      : `Audience struggled with this concept. Launch a debate or remediation poll to solidify understanding.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  playClickSound();
                  setIsGeneratingRemediation(true);
                  try {
                    await onLaunchRemediationPoll({
                      question,
                      mostPickedWrong,
                      votesDistribution,
                    });
                  } finally {
                    setIsGeneratingRemediation(false);
                  }
                }}
                disabled={isGeneratingRemediation}
                className="px-4 py-2.5 btn-noma-orange font-mono text-xs font-bold uppercase rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isGeneratingRemediation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Poll...</span>
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4" />
                    <span>Launch Remediation Poll</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* AI Synthesizing live follow-up badge */}
          {quizState.isAIGeneratingNext && (
            <div className="px-4 py-3 rounded-2xl border bg-lime/20 border-lime text-ink flex items-center justify-between font-mono text-xs animate-pulse">
              <div className="flex items-center space-x-2.5">
                <RefreshCw className="w-4 h-4 text-ink animate-spin shrink-0" />
                <span className="font-bold tracking-wider uppercase">
                  ✨ AI Synthesizing Next Challenge (Adapting to room accuracy)...
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-ink shrink-0">
                GENERATING LIVE
              </span>
            </div>
          )}

          {/* Auto-Advance Synchronized Ribbon (shown to both host and attendees) */}
          {quizState.autoAdvanceAt && (
            <div
              className={`px-4 py-3 rounded-2xl border flex items-center justify-between font-mono text-xs transition-colors ${
                isPaused
                  ? 'bg-orange/15 border-orange/30 text-orange'
                  : 'bg-paper-card border-hairline text-ink'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? 'bg-orange' : 'bg-lime animate-ping'
                  }`}
                />
                <span className="font-bold tracking-wider uppercase">
                  {isPaused
                    ? 'Host paused auto-advance countdown'
                    : hasNextQuestion
                    ? `Next challenge queuing automatically in ${autoAdvanceCountdown}s...`
                    : `Final round resolved. Transitioning to Leaderboard in ${autoAdvanceCountdown}s...`}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted shrink-0">
                {isPaused ? 'ON HOLD' : 'SYNCED LIVE'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Host Control Actions */}
      {isHost && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Left: Auto-Advance Toggle Pill */}
          <div className="flex items-center">
            <button
              onClick={() => {
                playClickSound();
                onToggleAutoAdvance?.();
              }}
              className={`w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border text-xs font-mono font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                isAutoAdvanceEnabled
                  ? 'bg-ink text-paper border-ink shadow-xs'
                  : 'bg-paper-card border-hairline text-muted hover:text-ink'
              }`}
              title="Toggle automatic progression to the next question"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoAdvanceEnabled ? 'text-lime' : 'text-muted'}`} />
              <span>AUTO-ADVANCE: {isAutoAdvanceEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Right: Reveal / Pause / Resume / Next Question Now */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap sm:justify-end">
            {!isRevealed ? (
              <div className="flex items-center gap-2.5 flex-wrap sm:justify-end w-full sm:w-auto">
                {onExtendTime && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playPopSound();
                      onExtendTime(20);
                    }}
                    className="px-4 py-2.5 min-h-[44px] bg-paper-card hover:bg-black/[0.04] text-ink border border-hairline rounded-xl text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-xs"
                    title="Add +20 seconds to the current round timer for everyone"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange" />
                    <span>+20S TIME</span>
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    onRevealAnswer();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] btn-noma-orange text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>REVEAL CORRECT ANSWER</span>
                </motion.button>
              </div>
            ) : (
              <>
                {/* Pause / Resume Button if Auto-Advance is scheduled */}
                {quizState.autoAdvanceAt && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playClickSound();
                      if (isPaused) {
                        onResumeAutoAdvance?.();
                      } else {
                        onPauseAutoAdvance?.();
                      }
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer border transition-colors ${
                      isPaused
                        ? 'bg-lime/30 border-lime text-ink hover:bg-lime/40'
                        : 'bg-orange/15 border-orange/30 text-orange hover:bg-orange/25'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>RESUME COUNTDOWN</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>PAUSE COUNTDOWN</span>
                      </>
                    )}
                  </motion.button>
                )}

                {/* Next Question Now (Skip countdown early) */}
                {hasNextQuestion && onNextQuestion ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (quizState.isAIGeneratingNext) return;
                      playClickSound();
                      onNextQuestion();
                    }}
                    disabled={quizState.isAIGeneratingNext}
                    className={`w-full sm:w-auto px-6 py-2.5 min-h-[44px] text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 transition-all ${
                      quizState.isAIGeneratingNext
                        ? 'bg-paper-card border border-hairline text-muted cursor-not-allowed'
                        : 'btn-noma-lime cursor-pointer shadow-sm'
                    }`}
                  >
                    {quizState.isAIGeneratingNext ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-ink" />
                        <span>SYNTHESIZING NEXT...</span>
                      </>
                    ) : (
                      <>
                        <span>NEXT QUESTION NOW</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
                    <span className="px-4 py-2.5 min-h-[44px] rounded-xl bg-lime/30 text-ink border border-lime font-mono text-xs font-bold uppercase flex items-center justify-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-ink stroke-[2]" />
                      <span>QUIZ COMPLETED</span>
                    </span>
                    {onClearActiveQuiz && (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          playClickSound();
                          onClearActiveQuiz();
                          onViewScores?.();
                        }}
                        className="px-4 py-2.5 min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                        title="Clear this completed round and return arena to standby"
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>CLEAR ROUND</span>
                      </motion.button>
                    )}
                    {onViewScores && (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          playClickSound();
                          onViewScores();
                        }}
                        className="px-5 py-2.5 min-h-[44px] rounded-xl bg-ink hover:bg-ink-light text-paper text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Trophy className="w-4 h-4 text-lime" />
                        <span>VIEW LEADERBOARD</span>
                      </motion.button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Clearance Spacer */}
      <div className="h-10 sm:h-12 md:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </motion.div>
  );
};
