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
import confetti from 'canvas-confetti';
import type { QuizRoundState, QuizQuestion, QuizOption } from '../../types';
import { gradeShortAnswerWithJev } from '../../lib/meshApi';
import {
  playPopSound,
  playClickSound,
  playSuccessFanfare,
  playErrorBuzz,
  playCountdownTick,
} from '../../lib/soundFx';
import { RollingCounter } from '../common/RollingCounter';

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
}

/**
 * Formats question and option text, highlighting inline code backticks with monospace styling
 * for enhanced technical legibility.
 */
const renderFormattedText = (text: string) => {
  if (!text) return null;
  if (text.includes('`')) {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-[#1C1C24] text-cyan-300 font-mono text-[0.88em] font-medium border border-cyan-500/25"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
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
          try {
            confetti({
              particleCount: 50,
              spread: 50,
              origin: { y: 0.6 },
              colors: ['#3B82F6', '#FAFAFA', '#10B981', '#60A5FA'],
            });
          } catch {
            // ignore
          }
        } else {
          playErrorBuzz();
        }
      }
    } else if (!isRevealed) {
      hasPlayedRevealRef.current = false;
    }
  }, [isRevealed, isCorrect, userSelectedOption, question]);

  if (!question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#121215] text-blue-400 border border-white/[0.08] flex items-center justify-center mb-4 shadow-sm">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>
        <div className="text-[11px] font-mono tracking-widest text-blue-400 uppercase font-bold mb-1">
          ARENA STANDBY
        </div>
        <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white uppercase tracking-tight mb-3">
          NO ACTIVE QUIZ ROUND
        </h3>
        <p className="text-xs font-sans text-zinc-400 max-w-md bg-[#121215] p-4 rounded-xl border border-white/[0.08] leading-relaxed">
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
        return 'bg-emerald-950/30 text-white border-2 border-emerald-500 shadow-sm font-bold';
      }
      if (isSelected && !isAnswer) {
        return 'bg-red-950/30 text-white border-2 border-red-500 shadow-sm font-bold';
      }
      return 'bg-[#101014] text-zinc-600 border border-white/[0.04] opacity-40';
    }

    if (isSelected) {
      return 'bg-blue-500/10 text-white border-2 border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.15)] font-bold';
    }

    return 'bg-[#121215] hover:bg-[#18181E] text-zinc-300 hover:text-white border border-white/[0.08] hover:border-blue-500/40';
  };

  const getOptionBadgeClass = (optionId: string) => {
    const isSelected = userSelectedOption === optionId;
    const isAnswer = question.correctOptionId === optionId;

    if (isRevealed) {
      if (isAnswer) return 'bg-emerald-600 text-white border-emerald-500';
      if (isSelected && !isAnswer) return 'bg-red-600 text-white border-red-500';
    }
    if (isSelected) return 'bg-blue-600 text-white border-blue-500';
    return 'bg-[#1A1A20] text-zinc-400 border-white/[0.08]';
  };

  const timerPercentage = Math.max(0, (timeRemaining / (quizState.totalSeconds || 25)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-2.5 sm:p-4 md:p-5 space-y-3.5 sm:space-y-4 font-sans"
    >
      {/* Clean Top Status Bar */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <span className={`w-2 h-2 rounded-full ${quizState.isAdaptiveCampaign ? 'bg-purple-500 animate-ping' : 'bg-blue-500 animate-pulse'}`} />
            <span className={`${quizState.isAdaptiveCampaign ? 'text-purple-400' : 'text-blue-400'} font-bold text-[10px] tracking-wider uppercase`}>
              {quizState.isAdaptiveCampaign ? 'ADAPTIVE ARENA' : 'LIVE ARENA'}
            </span>
          </div>
          <span className="text-zinc-700 hidden xs:inline">/</span>
          <span className="text-zinc-300 text-[10px] sm:text-[11px] font-semibold truncate uppercase tracking-wider max-w-[130px] sm:max-w-none">
            {question.category.replace(/_/g, ' ')}
          </span>
          {question.difficultyTier && (
            <>
              <span className="text-zinc-700 hidden sm:inline">/</span>
              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[9px] sm:text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                {question.difficultyTier} TIER
              </span>
            </>
          )}
          {quizState.adaptiveProgress && (
            <>
              <span className="text-zinc-700 hidden sm:inline">/</span>
              <span className="text-purple-400 text-[9px] sm:text-[10px] font-bold tracking-wider">
                ROUND {quizState.adaptiveProgress.current} OF {quizState.adaptiveProgress.total}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 text-[10px] sm:text-[11px] shrink-0">
          <span className="text-zinc-500">
            STATUS: <span className="text-zinc-200">{isRevealed ? 'RESOLVED' : 'ACTIVE'}</span>
          </span>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-500">
            VOTES: <span className="text-blue-400 font-bold">{totalVotes}</span>
          </span>
        </div>
      </div>

      {/* Exaggerated Minimalist Countdown & Progress Section */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
            {isRevealed ? (quizState.autoAdvanceAt ? 'AUTO-ADVANCE' : 'ROUND STATUS') : 'ROUND TIMER'}
          </div>
          <div className="flex items-baseline space-x-2 sm:space-x-3 flex-wrap">
            <div className="font-timer text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white">
              {!isRevealed ? (
                <RollingCounter value={timeRemaining} padZero={true} />
              ) : quizState.autoAdvanceAt ? (
                quizState.isAIGeneratingNext && autoAdvanceCountdown === 0 ? (
                  <span className="text-purple-400 text-3xl sm:text-4xl font-mono tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400 shrink-0" />
                    SYNTHESIZING
                  </span>
                ) : isPaused ? (
                  <span className="text-amber-400 text-3xl sm:text-4xl md:text-5xl font-mono tracking-tight flex items-center gap-2">
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 inline-block animate-pulse text-amber-400" />
                    PAUSED
                  </span>
                ) : (
                  <span className="text-blue-400">
                    <RollingCounter value={autoAdvanceCountdown} padZero={true} />
                  </span>
                )
              ) : (
                <span className="text-blue-400 text-3xl sm:text-4xl md:text-5xl font-mono tracking-tight">
                  REVEALED
                </span>
              )}
            </div>
            {!isRevealed ? (
              <span className="font-mono text-xs sm:text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                SECONDS REMAINING
              </span>
            ) : quizState.autoAdvanceAt ? (
              <span className="font-mono text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
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
              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>TIME REMAINING</span>
                <span className={timeRemaining <= 5 ? 'text-red-400 font-bold' : 'text-blue-400'}>
                  {Math.round(timerPercentage)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#18181D] rounded-full border border-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${timeRemaining <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${timerPercentage}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </>
          ) : quizState.autoAdvanceAt ? (
            <>
              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>TRANSITION</span>
                <span className={isPaused ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                  {isPaused ? 'PAUSED' : `${autoAdvanceCountdown}S`}
                </span>
              </div>
              <div className="w-full h-2 bg-[#18181D] rounded-full border border-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isPaused ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (autoAdvanceCountdown / 5) * 100))}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Question Prompt Card with Clean Typographic Hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-[#121215] p-4 sm:p-6 md:p-8 rounded-2xl border border-white/[0.08] shadow-sm relative"
      >
        <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold mb-2.5 flex items-center justify-between flex-wrap gap-1">
          <span>CHALLENGE QUESTION</span>
          {question.difficultyTier && (
            <span className="text-zinc-500 font-normal text-[10px]">
              DIFFICULTY: <span className="text-zinc-300 font-bold">{question.difficultyTier}</span>
            </span>
          )}
        </div>

        {/* Adaptive Dynamic Gamification Banner (Sleek Single-Line Layout) */}
        {question.adaptiveMeta && (
          question.adaptiveMeta.adaptationType === 'level_up' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-3.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2.5 overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.08)]"
            >
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                <span className="font-extrabold tracking-wide uppercase text-[11px] sm:text-xs text-white shrink-0">
                  LEVEL UP!
                </span>
                <span className="text-amber-400 font-bold tracking-wide uppercase text-[11px] sm:text-xs shrink-0">
                  • PREV. ACCURACY: {Math.round(question.adaptiveMeta.previousAccuracy ?? 0)}%
                </span>
                <span className="text-zinc-400 text-[11px] sm:text-xs truncate hidden md:inline">
                  — Elevating challenge to deeper edge cases
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-amber-500/40 shrink-0 whitespace-nowrap">
                {question.difficultyTier || 'Senior'} TIER
              </span>
            </motion.div>
          ) : question.adaptiveMeta.adaptationType === 'stepped_down' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-3.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between gap-2.5 overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.08)]"
            >
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-extrabold tracking-wide uppercase text-[11px] sm:text-xs text-white shrink-0">
                  FOUNDATION CHECK
                </span>
                <span className="text-blue-400 font-bold tracking-wide uppercase text-[11px] sm:text-xs shrink-0">
                  • PREV. ACCURACY: {Math.round(question.adaptiveMeta.previousAccuracy ?? 0)}%
                </span>
                <span className="text-zinc-400 text-[11px] sm:text-xs truncate hidden md:inline">
                  — Re-anchoring core mental models & essentials
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-blue-500/40 shrink-0 whitespace-nowrap">
                {question.difficultyTier || 'Junior'} TIER
              </span>
            </motion.div>
          ) : (
            <div className="mb-3.5 px-3 py-2 rounded-xl bg-[#16161D] border border-white/[0.08] text-zinc-300 text-xs flex items-center justify-between gap-2.5 overflow-hidden">
              <div className="flex items-center space-x-2 font-mono min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-bold tracking-wide uppercase text-zinc-200 text-[11px] sm:text-xs truncate">
                  {question.adaptiveMeta.questionNumber === 1
                    ? `ADAPTIVE JOURNEY: CHALLENGE 1 OF ${question.adaptiveMeta.totalQuestions}`
                    : `STEADY PACE: MAINTAINING ${question.difficultyTier || 'Senior'} TIER`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-mono text-[10px] font-bold tracking-wider uppercase border border-white/[0.08] shrink-0 whitespace-nowrap">
                {question.difficultyTier || 'Senior'} TIER
              </span>
            </div>
          )
        )}

        <h2 className="text-lg sm:text-2xl md:text-[28px] lg:text-3xl font-question font-bold text-white leading-snug sm:leading-[1.35] tracking-[-0.012em]">
          {renderFormattedText(question.question)}
        </h2>
      </motion.div>

      {/* Short Answer Mode or Multiple Choice Cards */}
      {question.questionType === 'short_answer' ? (
        <div className="p-5 sm:p-6 bg-[#121215] border border-white/[0.08] rounded-2xl space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-400 font-bold uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Freeform Technical Short Answer</span>
            </span>
            <span className="text-[10px] text-zinc-500">
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
                className="w-full px-4 py-3 bg-[#0A0A0C] border border-white/[0.1] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500 disabled:opacity-60 placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {shortAnswerGradeResult ? (
                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                      shortAnswerGradeResult.isCorrect
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {shortAnswerGradeResult.isCorrect ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Correct! Jev score: {Math.round(shortAnswerGradeResult.confidence * 100)}%</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect answer</span>
                      </>
                    )}
                  </span>
                ) : userSelectedOption ? (
                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 ${
                      userSelectedOption === (question.correctOptionId || 'A')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {userSelectedOption === (question.correctOptionId || 'A') ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Submitted (Correct)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Submitted (Incorrect)</span>
                      </>
                    )}
                  </span>
                ) : isRevealed ? (
                  <span className="px-3 py-1 rounded-full font-mono text-xs font-bold uppercase inline-flex items-center gap-1.5 bg-zinc-800 text-zinc-400 border border-white/[0.08]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time expired</span>
                  </span>
                ) : null}
              </div>

              {!userSelectedOption && !isRevealed && (
                <button
                  type="button"
                  onClick={handleShortAnswerSubmit}
                  disabled={!shortAnswerInput.trim() || isGradingShortAnswer}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isGradingShortAnswer ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <span>{isHost ? 'Test / Submit Answer' : 'Submit Answer'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {isHost && (
            <div className="p-3.5 bg-[#0A0A0C] border border-white/[0.06] rounded-xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 uppercase text-[10px] font-bold">Host Ground Truth Reference:</span>
                <span className="text-[10px] text-zinc-500">Live Correct: {correctCount} / {totalVotes}</span>
              </div>
              <div className="text-white font-semibold flex items-center gap-2 flex-wrap">
                <span>Expected:</span>
                <code className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {question.expectedAnswer || question.correctOptionId}
                </code>
                {question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
                  <span className="text-zinc-500 text-[11px]">
                    (Synonyms: {question.acceptableAnswers.join(', ')})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4 Precision Option Cards (A, B, C, D) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
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
                className={`p-3.5 sm:p-5 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[80px] sm:min-h-[96px] cursor-pointer ${getOptionButtonClass(
                  option.id
                )}`}
              >
                {/* Fill bar for vote counts */}
                {(isRevealed || isHost) && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-15 ${
                      isAnswer ? 'bg-emerald-500' : isSelected ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${votePct}%` }}
                  />
                )}

                <div className="flex items-start justify-between relative z-10 gap-2 sm:gap-3 mb-2 w-full min-w-0">
                  <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center border shrink-0 font-bold ${getOptionBadgeClass(
                        option.id
                      )}`}
                    >
                      {option.id}
                    </span>
                    <span className="text-xs sm:text-sm md:text-[15px] font-semibold leading-relaxed tracking-normal font-question break-words text-zinc-100">
                      {renderFormattedText(option.text)}
                    </span>
                  </div>

                  {isRevealed && isAnswer && (
                    <CheckCircle className="w-5 h-5 text-emerald-400 stroke-[2] shrink-0" />
                  )}
                  {isRevealed && isSelected && !isAnswer && (
                    <XCircle className="w-5 h-5 text-red-400 stroke-[2] shrink-0" />
                  )}
                </div>

                {/* Vote statistics */}
                {(isRevealed || isHost) && (
                  <div className="flex justify-between items-center text-[11px] font-mono pt-2 border-t border-white/[0.08] relative z-10 text-zinc-400">
                    <span>{voteCount} VOTES</span>
                    <span className="font-bold text-white">{votePct}%</span>
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
          className="bg-[#121215] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-3.5 shadow-sm"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {userSelectedOption ? (
                isCorrect ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-400 font-mono font-bold text-xs uppercase border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 stroke-[2]" />
                    <span>CORRECT ANSWER</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-red-950/40 text-red-400 font-mono font-bold text-xs uppercase border border-red-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 stroke-[2]" />
                    <span>INCORRECT ANSWER</span>
                  </span>
                )
              ) : (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-mono font-bold text-xs uppercase border border-blue-500/20">
                  ROUND RESOLVED
                </span>
              )}
            </div>

            <div className="font-mono font-bold text-xs uppercase bg-[#18181D] text-white px-3 py-1 rounded-full border border-white/[0.08]">
              {question.questionType === 'short_answer' ? (
                <>
                  CORRECT ANSWER:{' '}
                  <span className="text-emerald-400 font-mono">[{question.expectedAnswer || question.correctOptionId}]</span>
                </>
              ) : (
                <>
                  CORRECT OPTION: <span className="text-blue-400">[{question.correctOptionId}]</span>
                </>
              )}
            </div>
          </div>

          {/* Architectural Explanation */}
          <div className="p-4 bg-[#141418] rounded-xl border border-white/[0.06] font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <div className="flex items-center space-x-1.5 font-mono font-bold uppercase text-[11px] mb-1.5 text-blue-400">
              <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
              <span>KEY TAKEAWAY</span>
            </div>
            <p className="font-normal text-zinc-300 font-question leading-relaxed">{renderFormattedText(question.explanation)}</p>
            {question.questionType === 'short_answer' && question.acceptableAnswers && question.acceptableAnswers.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] text-xs font-mono text-zinc-400 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold uppercase text-[10px] text-zinc-500">Also Accepted:</span>
                {question.acceptableAnswers.map((syn, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[11px]">
                    {syn}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Smart Remediation Poll Trigger for Host */}
          {isHighMisconception && onLaunchRemediationPoll && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 rounded-xl flex items-center justify-between flex-wrap gap-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                    High Misconception Detected ({failurePct}% Incorrect)
                  </div>
                  <p className="text-[12px] text-zinc-300 font-sans mt-0.5">
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
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-mono text-xs font-bold uppercase rounded-xl border border-amber-400/40 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isGeneratingRemediation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Poll...</span>
                  </>
                ) : (
                  <>
                    <Vote className="w-3.5 h-3.5" />
                    <span>Launch Remediation Poll</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* AI Synthesizing live follow-up badge */}
          {quizState.isAIGeneratingNext && (
            <div className="px-4 py-2.5 rounded-xl border bg-purple-950/25 border-purple-500/30 text-purple-300 flex items-center justify-between font-mono text-xs animate-pulse">
              <div className="flex items-center space-x-2.5">
                <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
                <span className="font-bold tracking-wider uppercase">
                  ✨ AI Synthesizing Next Challenge (Adapting to room accuracy)...
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 shrink-0">
                GENERATING LIVE
              </span>
            </div>
          )}

          {/* Auto-Advance Synchronized Ribbon (shown to both host and attendees) */}
          {quizState.autoAdvanceAt && (
            <div
              className={`px-4 py-2.5 rounded-xl border flex items-center justify-between font-mono text-xs transition-colors ${
                isPaused
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPaused ? 'bg-amber-400' : 'bg-blue-400 animate-ping'
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
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">
                {isPaused ? 'ON HOLD' : 'SYNCED LIVE'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Host Control Actions */}
      {isHost && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2">
          {/* Left: Auto-Advance Toggle Pill */}
          <div className="flex items-center">
            <button
              onClick={() => {
                playClickSound();
                onToggleAutoAdvance?.();
              }}
              className={`w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl border text-xs font-mono font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                isAutoAdvanceEnabled
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'bg-[#18181D] border-white/[0.08] text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle automatic progression to the next question"
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoAdvanceEnabled ? 'text-blue-400' : 'text-zinc-500'}`} />
              <span>AUTO-ADVANCE: {isAutoAdvanceEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Right: Reveal / Pause / Resume / Next Question Now */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap sm:justify-end">
            {!isRevealed ? (
              <div className="flex items-center gap-2 flex-wrap sm:justify-end w-full sm:w-auto">
                {onExtendTime && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playPopSound();
                      onExtendTime(20);
                    }}
                    className="px-3.5 py-2.5 min-h-[44px] bg-[#16161C] hover:bg-[#1E1E26] text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                    title="Add +20 seconds to the current round timer for everyone"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>+20S TIME</span>
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    onRevealAnswer();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
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
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
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
                        ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300 cursor-not-allowed'
                        : 'btn-cobalt cursor-pointer'
                    }`}
                  >
                    {quizState.isAIGeneratingNext ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
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
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="px-3.5 py-2 min-h-[44px] rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold uppercase flex items-center justify-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2]" />
                      <span>QUIZ COMPLETED</span>
                    </span>
                    {onViewScores && (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          playClickSound();
                          onViewScores();
                        }}
                        className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.08] text-xs font-mono font-bold uppercase flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                      >
                        <Trophy className="w-4 h-4 text-blue-400" />
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
    </motion.div>
  );
};
