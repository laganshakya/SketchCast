import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Sparkles,
  Plus,
  Edit3,
  Download,
  Upload,
  Layers,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import type { SlideDeck, SlideReactionBurst } from '../../types';
import { SlideRenderer } from './SlideRenderer';
import { PresenterOverlay } from './PresenterOverlay';
import { AttendeeSlideView } from './AttendeeSlideView';
import { SlideEditorModal } from './SlideEditorModal';
import { AISlideGeneratorModal } from './AISlideGeneratorModal';
import {
  loadStoredDecks,
  saveStoredDecks,
  getStoredActiveDeckId,
  setStoredActiveDeckId,
  downloadDeckCartridge,
  importDeckFromJSON,
} from '../../lib/slides/slideStorage';
import { getStarterSlideDecks, createBlankSlide } from '../../lib/slides/slideTemplates';
import { RealtimeChannelManager } from '../../lib/realtime/channelManager';
import {
  playClickSound,
  playPopSound,
  playSlideReactionSound,
} from '../../lib/soundFx';

import type { QuizRoundState, QuizQuestion, LivePoll } from '../../types';

interface SlidesArenaViewProps {
  roomCode: string;
  isHost: boolean;
  channelManager: RealtimeChannelManager;
  userName?: string;
  sessionId?: string;
  onActivateQuizQuestion?: (questionId?: string) => void;
  onActivatePoll?: (pollId?: string) => void;
  // Unified Live Quiz & Live Polls Engine
  quizState?: QuizRoundState;
  timeRemaining?: number;
  userStreak?: number;
  onStartQuizRound?: (question: QuizQuestion) => void;
  onRevealQuizAnswer?: () => void;
  onSelectQuizOption?: (optionId: string) => void;
  polls?: LivePoll[];
  userPollVotes?: Record<string, string>;
  onVoteOnPoll?: (pollId: string, optionId: string) => void;
  onCreatePoll?: (title: string, options: string[]) => void;
}

export const SlidesArenaView: React.FC<SlidesArenaViewProps> = ({
  roomCode,
  isHost,
  channelManager,
  userName = 'Anonymous',
  sessionId = 'sess-local',
  onActivateQuizQuestion,
  onActivatePoll,
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
}) => {
  // Deck Management State
  const [decks, setDecks] = useState<SlideDeck[]>(() => loadStoredDecks(roomCode));
  const [activeDeckId, setActiveDeckId] = useState<string>(() => {
    const stored = getStoredActiveDeckId(roomCode);
    const initialDecks = loadStoredDecks(roomCode);
    if (stored && initialDecks.some((d) => d.id === stored)) return stored;
    return initialDecks[0]?.id || 'deck-default';
  });

  // Current Slide Navigation
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPresentingFullscreen, setIsPresentingFullscreen] = useState(false);
  // Default broadcasting to true so host changes auto-broadcast to all attendees
  const [isHostBroadcasting, setIsHostBroadcasting] = useState(true);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);

  // Live Audience Reactions Fountain
  const [reactions, setReactions] = useState<SlideReactionBurst[]>([]);

  const activeDeck = decks.find((d) => d.id === activeDeckId) || decks[0] || getStarterSlideDecks(roomCode)[0];

  // Keep latest refs for realtime responses without effect restarts (React Compiler compliant)
  const activeDeckRef = useRef(activeDeck);
  const currentSlideIndexRef = useRef(currentSlideIndex);
  const isHostBroadcastingRef = useRef(isHostBroadcasting);

  useEffect(() => {
    activeDeckRef.current = activeDeck;
    currentSlideIndexRef.current = currentSlideIndex;
    isHostBroadcastingRef.current = isHostBroadcasting;
  }, [activeDeck, currentSlideIndex, isHostBroadcasting]);

  // Broadcast slide changes to room when host navigates or toggles presentation
  const broadcastDeckSync = useCallback(
    (deck: SlideDeck, slideIdx: number, presenting: boolean) => {
      if (!isHost) return;
      channelManager.broadcast('slide_deck_sync', {
        roomId: roomCode,
        activeDeck: deck,
        currentSlideIndex: slideIdx,
        isPresenting: presenting,
        updatedBy: userName,
      });
    },
    [channelManager, isHost, roomCode, userName]
  );

  // Request sync on mount (for attendees or co-admins joining or switching tabs)
  useEffect(() => {
    channelManager.broadcast('slide_deck_sync_request', {
      roomId: roomCode,
      requesterSessionId: sessionId,
      requesterName: userName,
    });
  }, [channelManager, roomCode, sessionId, userName]);

  // Realtime Listeners for Audience, Co-Admins, and Host
  useEffect(() => {
    // 1. Host responds to late joiners' sync requests
    const unDeckReq = channelManager.on('slide_deck_sync_request', (payload) => {
      if (isHost && payload.roomId.toUpperCase().trim() === roomCode.toUpperCase().trim()) {
        broadcastDeckSync(
          activeDeckRef.current,
          currentSlideIndexRef.current,
          isHostBroadcastingRef.current
        );
      }
    });

    // 2. Co-admins and attendees receive host's live broadcast
    const unDeckSync = channelManager.on('slide_deck_sync', (payload) => {
      if (payload.roomId.toUpperCase().trim() === roomCode.toUpperCase().trim()) {
        if (payload.updatedBy !== userName) {
          if (!isHost) {
            // Attendees only receive the active broadcasted deck, hiding all other decks in library
            setDecks([payload.activeDeck]);
          } else {
            // Co-admins keep their deck cache up to date
            setDecks((prev) => {
              const exists = prev.some((d) => d.id === payload.activeDeck.id);
              return exists
                ? prev.map((d) => (d.id === payload.activeDeck.id ? payload.activeDeck : d))
                : [...prev, payload.activeDeck];
            });
          }
          setActiveDeckId(payload.activeDeck.id);
          setCurrentSlideIndex(payload.currentSlideIndex);
          setIsHostBroadcasting(payload.isPresenting);
        }
      }
    });

    // 3. Reaction bursts
    const unReaction = channelManager.on('slide_reaction_burst', (reaction) => {
      playSlideReactionSound();
      setReactions((prev) => [...prev.slice(-12), reaction]);
    });

    return () => {
      unDeckReq();
      unDeckSync();
      unReaction();
    };
  }, [broadcastDeckSync, channelManager, isHost, roomCode, userName]);

  // Host Navigates Slide
  const handleHostNavigateSlide = (index: number) => {
    const safeIdx = Math.max(0, Math.min(index, activeDeck.slides.length - 1));
    setCurrentSlideIndex(safeIdx);
    broadcastDeckSync(activeDeck, safeIdx, isHostBroadcasting);
  };

  // Host Toggles Live Broadcast
  const handleToggleBroadcast = () => {
    playClickSound();
    const nextBroadcasting = !isHostBroadcasting;
    setIsHostBroadcasting(nextBroadcasting);
    broadcastDeckSync(activeDeck, currentSlideIndex, nextBroadcasting);
  };

  // Host Updates Deck from Editor
  const handleSaveDeck = (updatedDeck: SlideDeck) => {
    const updated = decks.map((d) => (d.id === updatedDeck.id ? updatedDeck : d));
    setDecks(updated);
    saveStoredDecks(roomCode, updated);
    if (activeDeck.id === updatedDeck.id) {
      broadcastDeckSync(updatedDeck, currentSlideIndex, isHostBroadcasting);
    }
  };

  // Host Generates New Deck from AI
  const handleDeckGenerated = (newDeck: SlideDeck) => {
    const updated = [newDeck, ...decks];
    setDecks(updated);
    setActiveDeckId(newDeck.id);
    setStoredActiveDeckId(roomCode, newDeck.id);
    saveStoredDecks(roomCode, updated);
    setCurrentSlideIndex(0);
    broadcastDeckSync(newDeck, 0, isHostBroadcasting);
  };

  // Create Blank Deck
  const handleCreateBlankDeck = () => {
    playPopSound();
    const newDeck: SlideDeck = {
      id: `deck-${Date.now()}`,
      title: 'New Presentation Deck',
      subtitle: 'Created in SketchCast Studio',
      category: 'General',
      authorName: userName,
      theme: 'neo-brutalist',
      currentSlideIndex: 0,
      isPresenting: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slides: [
        createBlankSlide('title', 1),
        createBlankSlide('content', 2),
      ],
    };
    const updated = [newDeck, ...decks];
    setDecks(updated);
    setActiveDeckId(newDeck.id);
    setStoredActiveDeckId(roomCode, newDeck.id);
    saveStoredDecks(roomCode, updated);
    setCurrentSlideIndex(0);
  };

  // Import JSON Deck
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const imported = importDeckFromJSON(text);
        const updated = [imported, ...decks];
        setDecks(updated);
        setActiveDeckId(imported.id);
        setStoredActiveDeckId(roomCode, imported.id);
        saveStoredDecks(roomCode, updated);
        setCurrentSlideIndex(0);
        playPopSound();
      } catch {
        alert('Could not parse slide deck file. Please ensure it is a valid JSON deck cartridge.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Send Reaction (attendee or host)
  const handleSendReaction = (emoji: string) => {
    const burst: SlideReactionBurst = {
      id: `rxn-${Date.now()}-${Math.random()}`,
      emoji,
      senderSessionId: sessionId,
      senderName: userName,
      xOffset: Math.floor(Math.random() * 70) + 15,
      timestamp: Date.now(),
    };
    channelManager.broadcast('slide_reaction_burst', burst);
    setReactions((prev) => [...prev.slice(-12), burst]);
  };

  const currentSlide = activeDeck.slides[currentSlideIndex] || activeDeck.slides[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-5 font-sans">
      {/* Hidden File Input for Deck Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Arena Studio Toolbar */}
      <div className="bg-[#141721] text-white p-3 sm:p-4 border-4 border-black brutal-shadow-md mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-yellow text-black border-2 border-black brutal-shadow-xs flex items-center justify-center font-heavy shrink-0">
            <Layers className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE DECK:</span>
              {isHostBroadcasting && (
                <span className="px-1.5 py-0.2 bg-neo-pink text-black text-[9px] font-black uppercase animate-pulse border border-black">
                  BROADCASTING
                </span>
              )}
            </div>
            {/* Deck Selector Dropdown (Host Only) */}
            {isHost ? (
              <select
                value={activeDeckId}
                onChange={(e) => {
                  playClickSound();
                  setActiveDeckId(e.target.value);
                  setStoredActiveDeckId(roomCode, e.target.value);
                  setCurrentSlideIndex(0);
                  const selected = decks.find((d) => d.id === e.target.value);
                  if (selected) {
                    broadcastDeckSync(selected, 0, isHostBroadcasting);
                  }
                }}
                className="bg-[#212634] text-white font-bold text-xs sm:text-sm border border-black px-2 py-1 mt-0.5 max-w-full sm:max-w-xs truncate cursor-pointer focus:outline-none"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.slides.length} slides)
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-bold text-xs sm:text-sm text-white mt-0.5 truncate max-w-xs">
                {activeDeck.title}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Host */}
        {isHost ? (
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playClickSound();
                setIsPresentingFullscreen(true);
                setIsHostBroadcasting(true);
                broadcastDeckSync(activeDeck, currentSlideIndex, true);
              }}
              className="h-9 px-3 bg-neo-yellow hover:bg-neo-mint text-black font-heavy text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer"
              title="Launch Presenter Mode Fullscreen"
            >
              <Maximize2 className="w-4 h-4 stroke-[2.5]" />
              <span>PRESENT FULLSCREEN</span>
            </motion.button>

            <button
              onClick={() => {
                playClickSound();
                setIsAIGeneratorOpen(true);
              }}
              className="h-9 px-2.5 bg-[#2A3042] hover:bg-neo-cyan hover:text-black text-white font-bold text-xs uppercase border border-black flex items-center space-x-1 cursor-pointer transition-colors"
              title="Generate Deck with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-neo-yellow" />
              <span className="hidden sm:inline">AI DECK</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsEditorOpen(true);
              }}
              className="h-9 px-2.5 bg-[#2A3042] hover:bg-white hover:text-black text-white font-bold text-xs uppercase border border-black flex items-center space-x-1 cursor-pointer transition-colors"
              title="Edit Deck Slides"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EDIT</span>
            </button>

            <button
              onClick={() => downloadDeckCartridge(activeDeck)}
              className="h-9 px-2 bg-[#2A3042] hover:bg-slate-700 text-slate-300 font-bold text-xs border border-black cursor-pointer"
              title="Export JSON Deck"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-2 bg-[#2A3042] hover:bg-slate-700 text-slate-300 font-bold text-xs border border-black cursor-pointer"
              title="Import JSON Deck"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCreateBlankDeck}
              className="h-9 px-2 bg-[#2A3042] hover:bg-slate-700 text-slate-300 font-bold text-xs border border-black cursor-pointer"
              title="New Blank Deck"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-300 font-bold">
              Audience Sync Active
            </span>
          </div>
        )}
      </div>

      {/* Main Studio Display: Host Deck Controller vs Attendee Synced View */}
      {isHost ? (
        <div className="space-y-4">
          {/* Slide Stage Container */}
          <div className="w-full aspect-[16/9] min-h-[380px] sm:min-h-[480px] bg-[#0D0F15] text-white border-4 border-black brutal-shadow-lg overflow-hidden relative flex flex-col">
            <SlideRenderer
              slide={currentSlide}
              slideNumber={currentSlideIndex + 1}
              totalSlides={activeDeck.slides.length}
              isFullscreen={false}
              onActivateQuiz={onActivateQuizQuestion}
              onActivatePoll={onActivatePoll}
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
            />

            {/* Audience Reaction Bursts in Studio View */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              <AnimatePresence>
                {reactions.slice(-6).map((reaction) => (
                  <motion.div
                    key={reaction.id}
                    initial={{ opacity: 1, y: '100%', scale: 0.6 }}
                    animate={{ opacity: 0, y: '-10%', scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    style={{ left: `${reaction.xOffset}%` }}
                    className="absolute bottom-4 text-3xl sm:text-4xl drop-shadow select-none"
                  >
                    {reaction.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Host Controller Navigation Dock */}
          <div className="p-3 bg-[#151822] text-white border-3 border-black brutal-shadow-sm flex items-center justify-between font-mono text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleHostNavigateSlide(currentSlideIndex - 1)}
                disabled={currentSlideIndex === 0}
                className="px-3.5 py-1.5 bg-neo-yellow disabled:bg-[#222736] text-black disabled:text-slate-500 font-heavy uppercase border-2 border-black cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
                <span>PREV SLIDE</span>
              </button>

              <button
                type="button"
                onClick={() => handleHostNavigateSlide(currentSlideIndex + 1)}
                disabled={currentSlideIndex >= activeDeck.slides.length - 1}
                className="px-4 py-1.5 bg-neo-mint disabled:bg-[#222736] text-black disabled:text-slate-500 font-heavy uppercase border-2 border-black cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
              >
                <span>NEXT SLIDE</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div className="text-xs font-black uppercase text-neo-yellow">
              SLIDE {currentSlideIndex + 1} OF {activeDeck.slides.length}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleBroadcast}
                className={`px-3 py-1.5 border-2 border-black font-heavy text-xs uppercase cursor-pointer flex items-center space-x-1.5 transition-all ${
                  isHostBroadcasting
                    ? 'bg-neo-pink text-black brutal-shadow-xs'
                    : 'bg-[#222736] text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isHostBroadcasting ? 'animate-pulse text-black' : ''}`} />
                <span>{isHostBroadcasting ? 'LIVE BROADCASTING' : 'BROADCAST TO AUDIENCE'}</span>
              </button>
            </div>
          </div>

          {/* Slide Thumbnails Filmstrip */}
          <div className="p-2.5 bg-[#0D0F15] border-3 border-black overflow-x-auto flex items-center space-x-2.5">
            {activeDeck.slides.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => handleHostNavigateSlide(idx)}
                className={`w-36 sm:w-44 aspect-[16/9] p-2 border-2 cursor-pointer transition-all shrink-0 flex flex-col justify-between font-mono ${
                  idx === currentSlideIndex
                    ? 'bg-neo-yellow text-black border-black brutal-shadow-sm scale-105 font-black'
                    : 'bg-[#181C28] text-slate-300 border-slate-800 hover:border-neo-yellow hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                    idx === currentSlideIndex ? 'bg-black text-white' : 'bg-slate-700 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-[9px] font-bold uppercase ${
                    idx === currentSlideIndex ? 'text-black/80' : 'text-slate-400'
                  }`}>
                    {slide.type === 'custom' ? 'Custom' : slide.type}
                  </span>
                </div>
                <div className="font-bold text-[11px] truncate my-1">
                  {slide.title || `Slide ${idx + 1}`}
                </div>
                <div className={`text-[9px] truncate ${
                  idx === currentSlideIndex ? 'text-black/70' : 'text-slate-400'
                }`}>
                  {slide.subtitle || 'Presentation slide'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Attendee Live Synced View */
        <AttendeeSlideView
          deck={activeDeck}
          hostSlideIndex={currentSlideIndex}
          isPresenting={isHostBroadcasting}
          onSendReaction={handleSendReaction}
          reactions={reactions}
          userName={userName}
          quizState={quizState}
          timeRemaining={timeRemaining}
          userStreak={userStreak}
          onSelectQuizOption={onSelectQuizOption}
          polls={polls}
          userPollVotes={userPollVotes}
          onVoteOnPoll={onVoteOnPoll}
        />
      )}

      {/* Fullscreen Presenter Cockpit Overlay */}
      {isPresentingFullscreen && (
        <PresenterOverlay
          deck={activeDeck}
          currentSlideIndex={currentSlideIndex}
          onNavigateSlide={handleHostNavigateSlide}
          onClose={() => setIsPresentingFullscreen(false)}
          onActivateQuiz={onActivateQuizQuestion}
          onActivatePoll={onActivatePoll}
          reactions={reactions}
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
        />
      )}

      {/* Slide Visual Editor Modal */}
      {isEditorOpen && (
        <SlideEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          deck={activeDeck}
          onSaveDeck={handleSaveDeck}
        />
      )}

      {/* AI Deck Generator Modal */}
      {isAIGeneratorOpen && (
        <AISlideGeneratorModal
          isOpen={isAIGeneratorOpen}
          onClose={() => setIsAIGeneratorOpen(false)}
          onDeckGenerated={handleDeckGenerated}
          roomCode={roomCode}
          authorName={userName}
        />
      )}
    </div>
  );
};
