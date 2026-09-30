import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  Timer,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
} from 'lucide-react';
import { playPopSound, playSuccessFanfare, playClickSound } from '../../lib/soundFx';

interface ReactionParticle {
  id: string;
  emoji: string;
  x: number;
}

export const LandingPlayground: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(18);
  const [reactions, setReactions] = useState<ReactionParticle[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voterCount, setVoterCount] = useState(148);

  const questionData = {
    question: 'Which architectural protocol delivers sub-40ms realtime sync for 5,000+ concurrent keynote attendees?',
    options: [
      { text: 'Supabase Realtime WebSockets + Mesh Relay', percent: 86, isCorrect: true },
      { text: '5-second client-side interval polling', percent: 4, isCorrect: false },
      { text: 'Centralized SQL row-level database locks', percent: 7, isCorrect: false },
      { text: 'Static CDN cached edge polling', percent: 3, isCorrect: false },
    ],
    explanation: 'WebSockets with mesh pub/sub multiplexing bypasses disk I/O bottlenecks, keeping latency well under 40 milliseconds globally.',
  };

  // Decrement timer smoothly
  useEffect(() => {
    if (isAnswerRevealed) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsAnswerRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnswerRevealed]);

  // Subtle live voter count fluctuation for realism
  useEffect(() => {
    const voterInterval = setInterval(() => {
      setVoterCount((prev) => prev + (Math.random() > 0.4 ? 1 : -1));
    }, 3500);
    return () => clearInterval(voterInterval);
  }, []);

  const handleSelect = (idx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(idx);
    setIsAnswerRevealed(true);

    if (soundEnabled) {
      if (questionData.options[idx].isCorrect) {
        playSuccessFanfare();
      } else {
        playPopSound();
      }
    }

    // Trigger celebration reactions
    triggerReaction('🔥');
    triggerReaction('👏');
  };

  const handleReset = () => {
    if (soundEnabled) playClickSound();
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimerSeconds(20);
  };

  const reactionCounterRef = useRef(0);

  const triggerReaction = useCallback((emoji: string) => {
    if (soundEnabled) playPopSound();
    reactionCounterRef.current += 1;
    const count = reactionCounterRef.current;
    const newReaction: ReactionParticle = {
      id: `${Date.now()}_${count}`,
      emoji,
      x: 15 + ((count * 17) % 70),
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2200);
  }, [soundEnabled]);

  return (
    <div className="w-full bg-paper-card text-ink rounded-3xl border border-hairline-strong p-5 sm:p-7 shadow-elevated relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-lime/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-orange/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Reactions Canvas Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, y: 350, x: `${r.x}%`, scale: 0.6 }}
              animate={{ opacity: 0, y: -40, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="absolute text-2xl sm:text-3xl select-none"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header bar of simulated card */}
      <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-hairline relative z-10 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange animate-pulse" />
          <span className="font-bold text-orange uppercase tracking-wider text-[11px]">
            SIMULATED ARENA
          </span>
          <span className="text-muted/40">•</span>
          <span className="text-muted text-[10px] hidden sm:inline">QUESTION 03/05</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Active Attendees badge */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-paper border border-hairline text-[11px] font-bold text-ink">
            <Users className="w-3 h-3 text-muted" />
            <span>{voterCount} voting</span>
          </div>

          {/* Timer Ring Badge */}
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-orange/15 text-orange border border-orange/30 text-[11px] font-bold">
            <Timer className="w-3 h-3" />
            <span>{timerSeconds}s</span>
          </div>

          {/* Sound FX Toggle button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-full bg-paper hover:bg-paper-elevated text-muted hover:text-ink border border-hairline transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label="Toggle Sound Effects"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-orange" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-muted" />
            )}
          </button>

          {/* Reset Demo button */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-full bg-paper hover:bg-paper-elevated text-muted hover:text-ink border border-hairline transition-colors cursor-pointer"
            title="Reset interactive preview"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="space-y-2 mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-lime/30 text-ink border border-lime text-[10px] font-mono font-bold uppercase tracking-wider">
            SPEED MULTIPLIER 2.5X
          </span>
          <span className="text-muted font-mono text-[10px]">TIME-WEIGHTED SCORING</span>
        </div>
        <h3 className="text-base sm:text-lg font-serif font-bold text-ink leading-snug">
          {questionData.question}
        </h3>
      </div>

      {/* Option Buttons */}
      <div className="space-y-2.5 relative z-10 font-sans">
        {questionData.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const letter = String.fromCharCode(65 + idx);

          let optionStyle = 'bg-paper hover:bg-paper-elevated border-hairline text-ink';
          if (isAnswerRevealed) {
            if (opt.isCorrect) {
              optionStyle = 'bg-lime/25 border-lime text-ink font-semibold';
            } else if (isSelected && !opt.isCorrect) {
              optionStyle = 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400';
            } else {
              optionStyle = 'bg-paper/50 border-hairline text-muted opacity-80';
            }
          } else if (isSelected) {
            optionStyle = 'bg-ink text-paper border-ink';
          }

          return (
            <motion.button
              key={idx}
              whileHover={!isAnswerRevealed ? { scale: 1.01 } : {}}
              whileTap={!isAnswerRevealed ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(idx)}
              disabled={isAnswerRevealed}
              className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all relative overflow-hidden cursor-pointer shadow-subtle ${optionStyle}`}
            >
              {/* Animated Progress Bar when revealed */}
              {isAnswerRevealed && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${opt.percent}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 opacity-20 pointer-events-none ${
                    opt.isCorrect ? 'bg-lime' : 'bg-muted'
                  }`}
                />
              )}

              <div className="flex items-center space-x-3 min-w-0 relative z-10">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                    opt.isCorrect && isAnswerRevealed
                      ? 'bg-lime text-ink border-lime'
                      : isSelected
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper-card text-muted border-hairline'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-xs sm:text-sm font-medium leading-snug break-words">
                  {opt.text}
                </span>
              </div>

              {/* Status or percentage indicator */}
              <div className="flex items-center space-x-2 shrink-0 relative z-10 font-mono text-xs">
                {isAnswerRevealed ? (
                  <span className="font-bold">{opt.percent}%</span>
                ) : (
                  <span className="text-[10px] text-muted uppercase hidden sm:inline">Tap to vote</span>
                )}
                {isAnswerRevealed && opt.isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-lime shrink-0" />
                )}
                {isAnswerRevealed && isSelected && !opt.isCorrect && (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Answer Feedback / Score Banner */}
      <AnimatePresence>
        {isAnswerRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-3 border-t border-hairline space-y-2 relative z-10"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center space-x-1.5 text-orange font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {selectedOption === 0
                    ? 'CORRECT! +185 SPEED POINTS'
                    : 'KEY TAKEAWAY REVEALED'}
                </span>
              </span>
              <button
                onClick={handleReset}
                className="text-[11px] underline text-muted hover:text-ink cursor-pointer"
              >
                Try another choice
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed font-sans bg-paper p-3 rounded-xl border border-hairline">
              <strong className="text-ink font-mono uppercase text-[10px] block mb-0.5">
                Architecture Note:
              </strong>
              {questionData.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reactions Dock */}
      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between gap-2 relative z-10">
        <div className="text-[11px] font-mono text-muted uppercase flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-orange" />
          <span className="hidden sm:inline">Live Reactions:</span>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {['🔥', '👏', '💡', '🤯', '❤️', '🚀'].map((emoji) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 1.35 }}
              whileHover={{ scale: 1.15 }}
              onClick={() => triggerReaction(emoji)}
              className="p-1.5 sm:p-2 rounded-xl bg-paper hover:bg-paper-elevated border border-hairline text-base sm:text-lg transition-transform cursor-pointer shadow-2xs"
              title={`Send ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
