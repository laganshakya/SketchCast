import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { SlideDeck, SlideReactionBurst, QuizRoundState, LivePoll } from '../../types';
import { SlideRenderer } from './SlideRenderer';
import { playPopSound, playSlideAdvanceSound, playClickSound } from '../../lib/soundFx';

interface AttendeeSlideViewProps {
  deck: SlideDeck;
  hostSlideIndex: number;
  isPresenting: boolean;
  onSendReaction: (emoji: string) => void;
  reactions: SlideReactionBurst[];
  userName?: string;
  // Unified Live Quiz & Live Polls Integration
  quizState?: QuizRoundState;
  timeRemaining?: number;
  userStreak?: number;
  onSelectQuizOption?: (optionId: string) => void;
  polls?: LivePoll[];
  userPollVotes?: Record<string, string>;
  onVoteOnPoll?: (pollId: string, optionId: string) => void;
}

const REACTION_EMOJIS = ['👏', '🔥', '💡', '❤️', '🤯'];

export const AttendeeSlideView: React.FC<AttendeeSlideViewProps> = ({
  deck,
  hostSlideIndex,
  isPresenting,
  onSendReaction,
  reactions,
  quizState,
  timeRemaining,
  userStreak,
  onSelectQuizOption,
  polls,
  userPollVotes,
  onVoteOnPoll,
}) => {
  // Sync state: attendee can follow host or browse freely
  const [isFollowingHost, setIsFollowingHost] = useState(true);
  const [attendeeSlideIndex, setAttendeeSlideIndex] = useState(hostSlideIndex);
  const [showNotes, setShowNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeIndex = isFollowingHost ? hostSlideIndex : attendeeSlideIndex;
  const currentSlide = deck.slides[activeIndex] || deck.slides[0];

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setIsFollowingHost(false);
      playSlideAdvanceSound();
      setAttendeeSlideIndex(activeIndex - 1);
    }
  }, [activeIndex]);

  const handleNext = useCallback(() => {
    if (activeIndex < deck.slides.length - 1) {
      setIsFollowingHost(false);
      playSlideAdvanceSound();
      setAttendeeSlideIndex(activeIndex + 1);
    }
  }, [activeIndex, deck.slides.length]);

  const handleJumpToLive = () => {
    playPopSound();
    setIsFollowingHost(true);
    setAttendeeSlideIndex(hostSlideIndex);
  };

  const handleTriggerReaction = (emoji: string) => {
    playPopSound();
    onSendReaction(emoji);
  };

  const toggleFullscreen = () => {
    playClickSound();
    setIsFullscreen((prev) => !prev);
  };

  // Keyboard navigation & Fullscreen hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col items-center justify-start space-y-3 font-sans ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#0B0D13] p-2 sm:p-4 text-white overflow-hidden justify-between'
          : ''
      }`}
    >
      {/* Live Status & Top Action Bar */}
      <div className={`w-full ${isFullscreen ? 'max-w-7xl' : 'max-w-4xl'} bg-[#141721] text-white border-3 border-black p-2.5 sm:p-3 flex items-center justify-between font-mono text-xs brutal-shadow-sm flex-wrap gap-2 shrink-0`}>
        <div className="flex items-center space-x-2">
          {isPresenting ? (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-neo-pink text-black font-black text-[11px] uppercase border border-black animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>HOST PRESENTING LIVE</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 bg-slate-700 text-slate-300 font-bold text-[11px] uppercase">
              DECK PREVIEW
            </div>
          )}

          <span className="text-slate-300 font-bold hidden sm:inline truncate max-w-xs">
            {deck.title}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {!isFollowingHost && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleJumpToLive}
              className="px-2.5 py-1 bg-neo-yellow text-black font-black text-xs uppercase border border-black brutal-shadow-xs flex items-center space-x-1 cursor-pointer animate-bounce"
            >
              <Radio className="w-3 h-3 text-red-600" />
              <span>JUMP TO LIVE (SLIDE {hostSlideIndex + 1})</span>
            </motion.button>
          )}

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-2 py-1 text-xs font-bold border border-black flex items-center space-x-1 cursor-pointer transition-all ${
              showNotes ? 'bg-neo-cyan text-black font-black' : 'bg-[#212634] text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Speaker Notes"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">NOTES</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`px-2.5 py-1 text-xs font-bold border border-black flex items-center space-x-1 cursor-pointer transition-all ${
              isFullscreen ? 'bg-neo-yellow text-black font-black' : 'bg-[#212634] text-slate-200 hover:bg-slate-700'
            }`}
            title={isFullscreen ? 'Exit Fullscreen [ESC]' : 'Enter Fullscreen [F]'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      <div className={`w-full ${isFullscreen ? 'max-w-7xl flex-1 max-h-[82vh]' : 'max-w-4xl aspect-[16/9] min-h-[360px] sm:min-h-[460px]'} bg-[#0D0F15] text-white border-4 border-black brutal-shadow-lg relative overflow-hidden flex flex-col justify-center`}>
        <SlideRenderer
          slide={currentSlide}
          slideNumber={activeIndex + 1}
          totalSlides={deck.slides.length}
          isFullscreen={isFullscreen}
          isHost={false}
          quizState={quizState}
          timeRemaining={timeRemaining}
          userStreak={userStreak}
          onSelectQuizOption={onSelectQuizOption}
          polls={polls}
          userPollVotes={userPollVotes}
          onVoteOnPoll={onVoteOnPoll}
        />

        {/* Floating Audience Reactions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
          <AnimatePresence>
            {reactions.slice(-8).map((reaction) => (
              <motion.div
                key={reaction.id}
                initial={{ opacity: 1, y: '100%', scale: 0.7 }}
                animate={{ opacity: 0, y: '-10%', scale: 1.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, ease: 'easeOut' }}
                style={{ left: `${reaction.xOffset}%` }}
                className="absolute bottom-4 text-3xl sm:text-5xl drop-shadow select-none"
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Slide Navigation Controls & Reaction Fountain Bar */}
      <div className={`w-full ${isFullscreen ? 'max-w-7xl' : 'max-w-4xl'} flex items-center justify-between p-2.5 bg-[#151822] text-white border-3 border-black brutal-shadow-sm font-mono text-xs shrink-0 flex-wrap gap-2`}>
        {/* Step to Previous / Next Slide */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="px-3 py-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black disabled:opacity-30 text-white font-bold uppercase border-2 border-black cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
            title="Previous Slide [←]"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
            <span>PREV</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex >= deck.slides.length - 1}
            className="px-3 py-1.5 bg-neo-mint disabled:opacity-30 text-black font-heavy uppercase border-2 border-black cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
            title="Next Slide [→]"
          >
            <span>NEXT</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        {/* Slide Counter Indicator */}
        <div className="text-xs font-black uppercase text-neo-yellow">
          Slide {activeIndex + 1} of {deck.slides.length}
          {!isFollowingHost && (
            <span className="px-1.5 py-0.5 bg-neo-yellow text-black border border-black ml-2 font-bold">
              Reviewing Freely
            </span>
          )}
        </div>

        {/* Reaction Burst Emoji Fountain Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <span className="text-[10px] font-bold text-slate-400 hidden md:inline uppercase">
            React:
          </span>
          {REACTION_EMOJIS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleTriggerReaction(emoji)}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-[#222736] hover:bg-neo-yellow border-2 border-black flex items-center justify-center text-lg sm:text-xl cursor-pointer brutal-shadow-xs transition-colors"
              title={`Send ${emoji} Reaction`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Speaker Notes Takeaway Drawer */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`w-full ${isFullscreen ? 'max-w-7xl' : 'max-w-4xl'} bg-[#181C28] border-3 border-black p-4 font-mono text-xs brutal-shadow-sm overflow-hidden text-white`}
          >
            <div className="flex items-center space-x-2 font-black uppercase text-neo-yellow mb-1.5">
              <FileText className="w-4 h-4" />
              <span>SPEAKER NOTES & TAKEAWAYS (SLIDE {activeIndex + 1})</span>
            </div>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {currentSlide.speakerNotes || 'No speaker notes written for this slide.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
