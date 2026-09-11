import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Eye,
  Crosshair,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
} from 'lucide-react';
import type { SlideDeck, SlideReactionBurst, QuizRoundState, QuizQuestion, LivePoll } from '../../types';
import { SlideRenderer } from './SlideRenderer';
import {
  playSlideAdvanceSound,
  isSoundFxMuted,
  toggleMuteSoundFx,
} from '../../lib/soundFx';

interface PresenterOverlayProps {
  deck: SlideDeck;
  currentSlideIndex: number;
  onNavigateSlide: (index: number) => void;
  onClose: () => void;
  reactions: SlideReactionBurst[];
  // Unified Live Quiz Integration
  quizState?: QuizRoundState;
  timeRemaining?: number;
  userStreak?: number;
  onStartQuizRound?: (question: QuizQuestion) => void;
  onRevealQuizAnswer?: () => void;
  onSelectQuizOption?: (optionId: string) => void;
  // Unified Live Polls Integration
  polls?: LivePoll[];
  userPollVotes?: Record<string, string>;
  onVoteOnPoll?: (pollId: string, optionId: string) => void;
  onCreatePoll?: (title: string, options: string[]) => void;
  onActivateQuiz?: (questionId?: string) => void;
  onActivatePoll?: (pollId?: string) => void;
}

export const PresenterOverlay: React.FC<PresenterOverlayProps> = ({
  deck,
  currentSlideIndex,
  onNavigateSlide,
  onClose,
  reactions,
  quizState,
  timeRemaining,
  userStreak,
  onStartQuizRound,
  onRevealQuizAnswer,
  onSelectQuizOption,
  polls,
  userPollVotes,
  onVoteOnPoll,
  onCreatePoll,
  onActivateQuiz,
  onActivatePoll,
}) => {
  const [showNotes, setShowNotes] = useState(true);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(isSoundFxMuted());

  // Presentation Timer (Elapsed Seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSlide = deck.slides[currentSlideIndex] || deck.slides[0];
  const nextSlide = deck.slides[currentSlideIndex + 1] || null;

  const handleNext = useCallback(() => {
    if (currentSlideIndex < deck.slides.length - 1) {
      playSlideAdvanceSound();
      onNavigateSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, deck.slides.length, onNavigateSlide]);

  const handlePrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      playSlideAdvanceSound();
      onNavigateSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, onNavigateSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key.toLowerCase() === 'l') {
        setIsLaserActive((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n') {
        setShowNotes((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Track laser position
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLaserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  const toggleSound = () => {
    const nextMute = toggleMuteSoundFx();
    setIsMuted(nextMute);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 bg-[#0B0D13] text-white flex flex-col select-none overflow-hidden ${
        isLaserActive ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Laser Pointer Glow Dot */}
      {isLaserActive && (
        <div
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2"
          style={{ left: laserPos.x, top: laserPos.y }}
        >
          <div className="w-5 h-5 rounded-full bg-red-500 shadow-[0_0_15px_#ff0033,0_0_30px_#ff0055] border-2 border-white animate-pulse" />
        </div>
      )}

      {/* Presenter Top Bar */}
      <div className="h-12 bg-[#141721] border-b-3 border-black px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center space-x-3">
          <span className="px-2 py-0.5 bg-neo-yellow text-black font-black text-xs uppercase border border-black brutal-shadow-xs">
            LIVE PRESENTING
          </span>
          <span className="text-xs font-bold text-slate-300 truncate max-w-xs sm:max-w-md">
            {deck.title}
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Stopwatch Timer */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-black/60 border border-slate-700 text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-neo-mint" />
            <button
              onClick={() => setIsTimerRunning((prev) => !prev)}
              className="font-mono text-neo-mint hover:underline cursor-pointer"
              title={isTimerRunning ? 'Click to Pause Timer' : 'Click to Resume Timer'}
            >
              {formatTimer(elapsedSeconds)}
            </button>
            <button
              onClick={() => setElapsedSeconds(0)}
              className="text-slate-400 hover:text-white ml-1 p-0.5 cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Laser Pointer Toggle */}
          <button
            onClick={() => setIsLaserActive(!isLaserActive)}
            className={`px-2 py-1 text-xs font-bold border border-black flex items-center space-x-1 cursor-pointer transition-all ${
              isLaserActive ? 'bg-red-500 text-white font-black' : 'bg-[#222736] text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Laser Pointer [L]"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LASER</span>
          </button>

          {/* Speaker Notes Toggle */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-2 py-1 text-xs font-bold border border-black flex items-center space-x-1 cursor-pointer transition-all ${
              showNotes ? 'bg-neo-cyan text-black font-black' : 'bg-[#222736] text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Speaker Notes [N]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NOTES</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 bg-[#222736] hover:bg-slate-700 text-slate-300 border border-black cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-neo-mint" />}
          </button>

          {/* Exit Fullscreen */}
          <button
            onClick={onClose}
            className="p-1.5 bg-neo-pink text-black hover:bg-white border-2 border-black cursor-pointer transition-colors"
            title="Exit Presenter View [Esc]"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Main Slide & Presenter Split Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Stage Canvas */}
        <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="w-full max-w-6xl aspect-[16/9] bg-[#0D0F15] text-white border-4 border-black brutal-shadow-lg overflow-hidden relative flex flex-col">
            <SlideRenderer
              slide={currentSlide}
              slideNumber={currentSlideIndex + 1}
              totalSlides={deck.slides.length}
              isFullscreen={true}
              isHost={true}
              quizState={quizState}
              timeRemaining={timeRemaining}
              userStreak={userStreak}
              onStartQuizRound={onStartQuizRound}
              onRevealQuizAnswer={onRevealQuizAnswer}
              onSelectQuizOption={onSelectQuizOption}
              polls={polls}
              userPollVotes={userPollVotes}
              onVoteOnPoll={onVoteOnPoll}
              onCreatePoll={onCreatePoll}
              onActivateQuiz={onActivateQuiz}
              onActivatePoll={onActivatePoll}
            />

            {/* Audience Floating Reaction Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              <AnimatePresence>
                {reactions.slice(-8).map((reaction) => (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 1, y: '100%', scale: 0.6 }}
                    animate={{ opacity: 0, y: '-10%', scale: 1.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.2, ease: 'easeOut' }}
                    style={{ left: `${reaction.xOffset}%` }}
                    className="absolute bottom-4 text-3xl sm:text-5xl drop-shadow-md select-none"
                  >
                    {reaction.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Presenter Notes & Next Preview Sidebar */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="bg-[#12151D] border-l-3 border-black flex flex-col justify-between overflow-hidden shrink-0 font-sans"
            >
              {/* Speaker Notes Area */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                  <div className="flex items-center space-x-2 text-neo-yellow text-xs font-mono font-black uppercase">
                    <FileText className="w-4 h-4" />
                    <span>SPEAKER NOTES</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    SLIDE {currentSlideIndex + 1} OF {deck.slides.length}
                  </span>
                </div>

                <div className="bg-[#191D28] p-3.5 border-2 border-black text-slate-200 text-xs sm:text-sm leading-relaxed font-mono">
                  {currentSlide.speakerNotes ? (
                    <p className="whitespace-pre-wrap">{currentSlide.speakerNotes}</p>
                  ) : (
                    <p className="text-slate-500 italic">
                      No speaker notes written for this slide. Speak naturally on the core concepts!
                    </p>
                  )}
                </div>
              </div>

              {/* Next Slide Preview Box */}
              {nextSlide && (
                <div className="p-4 border-t-2 border-black bg-[#161922] shrink-0">
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold text-slate-400 uppercase mb-2">
                    <Eye className="w-3.5 h-3.5 text-neo-cyan" />
                    <span>UP NEXT (SLIDE {currentSlideIndex + 2}):</span>
                  </div>
                  <div className="p-2.5 bg-[#1C2130] text-white border-2 border-black brutal-shadow-xs">
                    <span className="px-1.5 py-0.2 bg-neo-yellow text-black font-mono text-[9px] font-black uppercase inline-block mb-1 border border-black">
                      {nextSlide.type}
                    </span>
                    <div className="font-heavy text-xs uppercase truncate text-white">
                      {nextSlide.title}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Presenter Bottom Navigation Bar */}
      <div className="h-16 bg-[#141721] border-t-3 border-black px-4 sm:px-6 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="h-10 px-3.5 bg-neo-yellow disabled:bg-slate-700 text-black disabled:text-slate-500 font-heavy text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">PREV</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={currentSlideIndex >= deck.slides.length - 1}
            className="h-10 px-4 bg-neo-mint disabled:bg-slate-700 text-black disabled:text-slate-500 font-heavy text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </motion.button>
        </div>

        {/* Slide Counter & Slide Dots */}
        <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md px-2">
          {deck.slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigateSlide(idx)}
              className={`h-7 px-2.5 text-xs font-black border border-black cursor-pointer transition-all ${
                idx === currentSlideIndex
                  ? 'bg-neo-pink text-black scale-110 font-heavy brutal-shadow-xs'
                  : 'bg-[#222736] text-slate-400 hover:text-white'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className="text-right text-xs font-mono text-slate-400 font-bold hidden sm:block">
          <span className="text-neo-yellow font-black">← / →</span> or <span className="text-neo-yellow font-black">Space</span> to advance
        </div>
      </div>
    </div>
  );
};
