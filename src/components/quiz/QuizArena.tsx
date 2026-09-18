import React, { useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import type { QuizRoundState } from '../../types';
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
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  quizState,
  timeRemaining,
  onSelectOption,
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
      className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-5 pb-24 sm:pb-28 md:pb-6 space-y-4 font-sans"
    >
      {/* Clean Top Status Bar */}
      <div className="bg-[#121215] border border-white/[0.08] rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-400 font-bold text-[10px] tracking-wider uppercase">LIVE ARENA</span>
          </div>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-300 text-[11px] font-semibold truncate uppercase tracking-wider">
            {question.category.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] shrink-0">
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
      <div className="bg-[#121215] border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
            {isRevealed ? (quizState.autoAdvanceAt ? 'AUTO-ADVANCE' : 'ROUND STATUS') : 'ROUND TIMER'}
          </div>
          <div className="flex items-baseline space-x-3">
            <div className="font-timer text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white">
              {!isRevealed ? (
                <RollingCounter value={timeRemaining} padZero={true} />
              ) : quizState.autoAdvanceAt ? (
                isPaused ? (
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
                {isPaused
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
        className="bg-[#121215] p-6 sm:p-8 rounded-2xl border border-white/[0.08] shadow-sm relative"
      >
        <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold mb-3">
          CHALLENGE QUESTION
        </div>

        <h2 className="text-lg sm:text-2xl md:text-3xl font-display font-extrabold text-white leading-tight tracking-tight">
          {question.question}
        </h2>
      </motion.div>

      {/* 4 Precision Option Cards (A, B, C, D) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {question.options.map((option) => {
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
              className={`p-4 sm:p-5 rounded-2xl text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[96px] cursor-pointer ${getOptionButtonClass(
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

              <div className="flex items-start justify-between relative z-10 gap-3 mb-2">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center border shrink-0 font-bold ${getOptionBadgeClass(
                      option.id
                    )}`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm font-semibold leading-snug tracking-tight font-sans">
                    {option.text}
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
              CORRECT OPTION: <span className="text-blue-400">[{question.correctOptionId}]</span>
            </div>
          </div>

          {/* Architectural Explanation */}
          <div className="p-4 bg-[#141418] rounded-xl border border-white/[0.06] font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <div className="flex items-center space-x-1.5 font-mono font-bold uppercase text-[11px] mb-1.5 text-blue-400">
              <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
              <span>KEY TAKEAWAY</span>
            </div>
            <p className="font-normal text-zinc-300">{question.explanation}</p>
          </div>

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
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
          {/* Left: Auto-Advance Toggle Pill */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                playClickSound();
                onToggleAutoAdvance?.();
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold flex items-center space-x-2 cursor-pointer transition-all ${
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
          <div className="flex items-center space-x-2 flex-wrap justify-end">
            {!isRevealed ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClickSound();
                  onRevealAnswer();
                }}
                className="w-full sm:w-auto px-5 py-2.5 btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>REVEAL CORRECT ANSWER</span>
              </motion.button>
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
                    className={`px-4 py-2.5 text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer border transition-colors ${
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
                      playClickSound();
                      onNextQuestion();
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 btn-cobalt text-xs font-mono font-bold uppercase rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>NEXT QUESTION NOW</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                ) : (
                  <div className="flex items-center space-x-2 flex-wrap w-full sm:w-auto justify-end">
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold uppercase flex items-center space-x-1.5">
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
                        className="px-5 py-2 rounded-xl bg-[#18181D] hover:bg-[#22222A] text-white border border-white/[0.08] text-xs font-mono font-bold uppercase flex items-center space-x-1.5 cursor-pointer transition-colors"
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
