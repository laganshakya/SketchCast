import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Layers,
  FileText,
  Check,
  HelpCircle,
  BarChart3,
  ImageIcon,
  ExternalLink,
  Plus,
  Heading,
  Type,
  Code2,
  TrendingUp,
  Quote,
  Tag,
  Sparkles,
  MoveUp,
  MoveDown,
  Palette,
  Columns,
  RotateCcw,
  Maximize2,
  Sliders,
  ChevronRight,
  Zap,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import type {
  SlideDeck,
  Slide,
  SlideType,
  SlideBlock,
  SlideBlockType,
  SlideLayoutType,
  SlideTransitionType,
  ElementAnimationType,
} from '../../types';
import { SlideRenderer } from './SlideRenderer';
import { createBlankSlide } from '../../lib/slides/slideTemplates';
import { CANVAS_THEMES } from '../../lib/slides/slideThemes';
import {
  ANIMATION_BUNDLES,
  TRANSITION_OPTIONS,
  ELEMENT_ANIMATION_OPTIONS,
  type AnimationBundleConfig,
} from '../../lib/slides/slideAnimations';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface SlideEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: SlideDeck;
  onSaveDeck: (updatedDeck: SlideDeck) => void;
}

type InspectorTab = 'content' | 'design' | 'animations';

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;

export const SlideEditorModal: React.FC<SlideEditorModalProps> = ({
  isOpen,
  onClose,
  deck,
  onSaveDeck,
}) => {
  const [currentDeck, setCurrentDeck] = useState<SlideDeck>(() => ({
    ...deck,
    slides: [...deck.slides],
  }));
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<InspectorTab>('content');
  const [animationTriggerKey, setAnimationTriggerKey] = useState(0);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [isFilmstripCollapsed, setIsFilmstripCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | '100%'>('fit');
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 720,
    height: 405,
  });
  const stageRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!stageRef.current) return;
    const updateDimensions = () => {
      if (!stageRef.current) return;
      const { clientWidth, clientHeight } = stageRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        const padW = Math.max(100, clientWidth - 24);
        const padH = Math.max(100, clientHeight - 24);
        let fitW = padW;
        let fitH = padW * (9 / 16);
        if (fitH > padH) {
          fitH = padH;
          fitW = padH * (16 / 9);
        }
        setStageDimensions({ width: Math.floor(fitW), height: Math.floor(fitH) });
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(() => {
      updateDimensions();
    });
    ro.observe(stageRef.current);
    window.addEventListener('resize', updateDimensions);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isFilmstripCollapsed, isInspectorCollapsed]);

  // Sync if deck changes externally
  const [prevDeckId, setPrevDeckId] = useState(deck.id);
  if (prevDeckId !== deck.id) {
    setPrevDeckId(deck.id);
    setCurrentDeck({ ...deck, slides: [...deck.slides] });
    setSelectedSlideIndex(0);
  }

  if (!isOpen) return null;

  const currentSlide = currentDeck.slides[selectedSlideIndex] || currentDeck.slides[0];

  const previewScale = zoomMode === 'fit' ? stageDimensions.width / BASE_WIDTH : 1;
  const stageBoxWidth = zoomMode === 'fit' ? stageDimensions.width : BASE_WIDTH;
  const stageBoxHeight = zoomMode === 'fit' ? stageDimensions.height : BASE_HEIGHT;

  const updateCurrentSlide = (patch: Partial<Slide>) => {
    const updatedSlides = currentDeck.slides.map((s, idx) =>
      idx === selectedSlideIndex ? { ...s, ...patch } : s
    );
    setCurrentDeck({ ...currentDeck, slides: updatedSlides, updatedAt: new Date().toISOString() });
  };

  const handleAddSlide = (type: SlideType) => {
    playPopSound();
    const newSlide = createBlankSlide(type, currentDeck.slides.length + 1);
    const updatedSlides = [...currentDeck.slides, newSlide];
    setCurrentDeck({ ...currentDeck, slides: updatedSlides });
    setSelectedSlideIndex(updatedSlides.length - 1);
    setAnimationTriggerKey((k) => k + 1);
  };

  const handleDeleteSlide = (index: number) => {
    if (currentDeck.slides.length <= 1) return;
    playClickSound();
    const updatedSlides = currentDeck.slides.filter((_, idx) => idx !== index);
    setCurrentDeck({ ...currentDeck, slides: updatedSlides });
    setSelectedSlideIndex(Math.min(selectedSlideIndex, updatedSlides.length - 1));
  };

  const handleDuplicateSlide = (index: number) => {
    playPopSound();
    const target = currentDeck.slides[index];
    const clone: Slide = {
      ...target,
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `${target.title} (Copy)`,
      blocks: target.blocks
        ? target.blocks.map((b) => ({
            ...b,
            id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          }))
        : undefined,
    };
    const updatedSlides = [...currentDeck.slides];
    updatedSlides.splice(index + 1, 0, clone);
    setCurrentDeck({ ...currentDeck, slides: updatedSlides });
    setSelectedSlideIndex(index + 1);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentDeck.slides.length - 1)
    ) {
      return;
    }
    playClickSound();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updatedSlides = [...currentDeck.slides];
    const temp = updatedSlides[index];
    updatedSlides[index] = updatedSlides[targetIdx];
    updatedSlides[targetIdx] = temp;
    setCurrentDeck({ ...currentDeck, slides: updatedSlides });
    setSelectedSlideIndex(targetIdx);
  };

  const handleSaveAndClose = () => {
    playClickSound();
    onSaveDeck(currentDeck);
    onClose();
  };

  const handleReplayAnimation = () => {
    playPopSound();
    setAnimationTriggerKey((k) => k + 1);
  };

  const handleApplyAnimationBundle = (bundle: AnimationBundleConfig) => {
    playPopSound();
    updateCurrentSlide({
      animationPreset: bundle.id,
      transition: bundle.transition,
      elementAnimation: bundle.elementAnimation,
      animationDuration: bundle.duration,
      animationDelay: bundle.delay,
    });
    setAnimationTriggerKey((k) => k + 1);
  };

  // Convert Preset slide into fully customized blocks
  const handleConvertPresetToCustom = () => {
    playPopSound();
    const blocks: SlideBlock[] = [];
    const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (currentSlide.badge) {
      blocks.push({
        id: genId('blk-badge'),
        type: 'badge',
        badgeText: currentSlide.badge,
        badgeColor: 'bg-neo-yellow',
        column: 0,
        align: 'left',
      });
    }

    if (currentSlide.title) {
      blocks.push({
        id: genId('blk-h'),
        type: 'heading',
        text: currentSlide.title,
        level: currentSlide.type === 'title' ? 1 : 2,
        column: 0,
        align: currentSlide.type === 'title' || currentSlide.type === 'stat' ? 'center' : 'left',
      });
    }

    if (currentSlide.subtitle) {
      blocks.push({
        id: genId('blk-sub'),
        type: 'text',
        text: currentSlide.subtitle,
        column: 0,
        align: currentSlide.type === 'title' || currentSlide.type === 'stat' ? 'center' : 'left',
      });
    }

    if (currentSlide.type === 'content') {
      if (currentSlide.bullets && currentSlide.bullets.length > 0) {
        blocks.push({
          id: genId('blk-bullets'),
          type: 'text',
          bullets: [...currentSlide.bullets],
          column: currentSlide.imageUrl && (currentSlide.imagePosition === 'right' || currentSlide.imagePosition === 'left') ? (currentSlide.imagePosition === 'left' ? 1 : 0) : 0,
          align: 'left',
        });
      } else if (currentSlide.markdown) {
        blocks.push({
          id: genId('blk-md'),
          type: 'text',
          text: currentSlide.markdown,
          column: 0,
          align: 'left',
        });
      }
    }

    if (currentSlide.type === 'code' && currentSlide.codeSnippet) {
      blocks.push({
        id: genId('blk-code'),
        type: 'code',
        codeSnippet: currentSlide.codeSnippet,
        codeLanguage: currentSlide.codeLanguage || 'typescript',
        codeExplanation: currentSlide.codeExplanation,
        column: 0,
        align: 'left',
      });
    }

    if (currentSlide.type === 'stat') {
      blocks.push({
        id: genId('blk-stat'),
        type: 'stat',
        statValue: currentSlide.statValue || '100%',
        statLabel: currentSlide.statLabel || 'Metric',
        statTrend: currentSlide.statTrend,
        column: 0,
        align: 'center',
        cardStyle: 'card-dark',
      });
    }

    if (currentSlide.type === 'quote') {
      blocks.push({
        id: genId('blk-quote'),
        type: 'quote',
        quoteText: currentSlide.quoteText || '',
        quoteAuthor: currentSlide.quoteAuthor || '',
        quoteRole: currentSlide.quoteRole || '',
        column: 0,
        align: 'left',
        cardStyle: 'card-dark',
      });
    }

    if (currentSlide.type === 'interactive_quiz') {
      blocks.push({
        id: genId('blk-quiz'),
        type: 'quiz',
        quizQuestion: currentSlide.quizQuestion || currentSlide.title,
        quizOptions: currentSlide.quizOptions ? [...currentSlide.quizOptions] : ['Option A', 'Option B', 'Option C', 'Option D'],
        quizCorrectIndex: currentSlide.quizCorrectIndex ?? 0,
        quizTimeLimitSeconds: currentSlide.quizTimeLimitSeconds || 20,
        quizExplanation: currentSlide.quizExplanation,
        column: 0,
        align: 'center',
      });
    }

    if (currentSlide.type === 'interactive_poll') {
      blocks.push({
        id: genId('blk-poll'),
        type: 'poll',
        pollQuestion: currentSlide.pollQuestion || currentSlide.title,
        pollOptions: currentSlide.pollOptions ? [...currentSlide.pollOptions] : ['Option A', 'Option B', 'Option C', 'Option D'],
        column: 0,
        align: 'center',
      });
    }

    if (currentSlide.imageUrl) {
      blocks.push({
        id: genId('blk-img'),
        type: 'image',
        imageUrl: currentSlide.imageUrl,
        imageCaption: currentSlide.imageCaption,
        column: currentSlide.imagePosition === 'right' ? 1 : 0,
        align: 'center',
      });
    }

    if (currentSlide.linkUrl) {
      blocks.push({
        id: genId('blk-btn'),
        type: 'button',
        buttonUrl: currentSlide.linkUrl,
        buttonLabel: currentSlide.linkLabel || 'Reference Link',
        column: 0,
        align: 'left',
      });
    }

    updateCurrentSlide({
      type: 'custom',
      layout: currentSlide.imageUrl && (currentSlide.imagePosition === 'right' || currentSlide.imagePosition === 'left') ? 'split-2' : 'single',
      canvasTheme: currentSlide.canvasTheme || 'retro-grid',
      transition: currentSlide.transition || 'arcade-pop',
      elementAnimation: currentSlide.elementAnimation || 'pop-in',
      blocks,
    });
    setActiveTab('content');
    setAnimationTriggerKey((k) => k + 1);
  };

  // Add block to custom slide
  const handleAddBlock = (type: SlideBlockType) => {
    playPopSound();
    const newBlockId = `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newBlock: SlideBlock;

    switch (type) {
      case 'heading':
        newBlock = {
          id: newBlockId,
          type: 'heading',
          text: 'Custom Section Heading',
          level: 2,
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      case 'text':
        newBlock = {
          id: newBlockId,
          type: 'text',
          text: 'Write detailed explanation, technical insights, or architecture points here.',
          bullets: [],
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      case 'image':
        newBlock = {
          id: newBlockId,
          type: 'image',
          imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
          imageCaption: 'Infrastructure Flow',
          column: 0,
          align: 'center',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      case 'code':
        newBlock = {
          id: newBlockId,
          type: 'code',
          codeSnippet: `// High-speed event channel\nexport const streamEvents = (topic: string) => {\n  return createPipeline({ topic, maxBatch: 5000 });\n};`,
          codeLanguage: 'typescript',
          codeExplanation: 'Streaming pipeline handling up to 5,000 events/sec.',
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      case 'stat':
        newBlock = {
          id: newBlockId,
          type: 'stat',
          statValue: '99.99%',
          statLabel: 'Realtime SLA Uptime',
          statTrend: '+4.2% YoY',
          column: 0,
          align: 'center',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'card-dark',
        };
        break;
      case 'quote':
        newBlock = {
          id: newBlockId,
          type: 'quote',
          quoteText: 'Simplicity is prerequisite for reliability.',
          quoteAuthor: 'Edsger W. Dijkstra',
          quoteRole: 'Computer Scientist & Turing Laureate',
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'card-dark',
        };
        break;
      case 'quiz':
        newBlock = {
          id: newBlockId,
          type: 'quiz',
          quizQuestion: 'Which protocol delivers lowest latency for live room sync?',
          quizOptions: ['WebSockets', 'HTTP Polling (10s)', 'Server-Sent Events (SSE)', 'FTP Stream'],
          quizCorrectIndex: 0,
          quizTimeLimitSeconds: 20,
          quizExplanation: 'WebSockets provide bidirectional, full-duplex TCP channels with sub-10ms overhead.',
          column: 0,
          align: 'center',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'card-dark',
        };
        break;
      case 'poll':
        newBlock = {
          id: newBlockId,
          type: 'poll',
          pollQuestion: 'Which frontend architecture does your team prioritize this quarter?',
          pollOptions: ['React 19 + Server Components', 'Vite SPA + Local State', 'Micro-frontends', 'Full SSR'],
          column: 0,
          align: 'center',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'card-dark',
        };
        break;
      case 'badge':
        newBlock = {
          id: newBlockId,
          type: 'badge',
          badgeText: 'HOT ARCHITECTURE',
          badgeColor: 'bg-neo-yellow',
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      case 'button':
        newBlock = {
          id: newBlockId,
          type: 'button',
          buttonLabel: 'Explore Live Demo →',
          buttonUrl: 'https://github.com',
          column: 0,
          align: 'left',
          offsetX: 0,
          offsetY: 0,
          cardStyle: 'transparent',
        };
        break;
      default:
        return;
    }

    const currentBlocks = currentSlide.blocks || [];
    updateCurrentSlide({ blocks: [...currentBlocks, newBlock] });
    setExpandedBlockId(newBlockId);
    setAnimationTriggerKey((k) => k + 1);
  };

  const updateBlock = (blockId: string, patch: Partial<SlideBlock>) => {
    const existing = currentSlide.blocks || [];
    const updated = existing.map((b) => (b.id === blockId ? { ...b, ...patch } : b));
    updateCurrentSlide({ blocks: updated });
  };

  const deleteBlock = (blockId: string) => {
    playClickSound();
    const existing = currentSlide.blocks || [];
    updateCurrentSlide({ blocks: existing.filter((b) => b.id !== blockId) });
    if (expandedBlockId === blockId) setExpandedBlockId(null);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const existing = [...(currentSlide.blocks || [])];
    const idx = existing.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= existing.length) return;
    playClickSound();
    const temp = existing[idx];
    existing[idx] = existing[targetIdx];
    existing[targetIdx] = temp;
    updateCurrentSlide({ blocks: existing });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md font-sans">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#151822] text-white w-full max-w-7xl h-[94vh] border-4 border-black brutal-shadow-lg flex flex-col overflow-hidden relative font-sans"
      >
        {/* Top Header */}
        <div className="bg-[#0D0F15] text-white px-4 py-3 border-b-3 border-black flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-neo-yellow text-black border-2 border-black flex items-center justify-center font-heavy brutal-shadow-xs shrink-0">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                SKETCHCAST SLIDE STUDIO // DECK BUILDER
              </div>
              <input
                type="text"
                value={currentDeck.title}
                onChange={(e) => setCurrentDeck({ ...currentDeck, title: e.target.value })}
                className="bg-transparent text-white font-heavy text-sm sm:text-base border-b border-slate-700 focus:border-neo-yellow focus:outline-none px-1 py-0.5 max-w-xs sm:max-w-md"
                placeholder="Deck Title..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowFullscreenPreview(true)}
              className="px-3 py-1.5 bg-[#212634] hover:bg-slate-700 text-slate-200 border-2 border-black font-bold text-xs uppercase flex items-center space-x-1.5 cursor-pointer transition-colors"
              title="Full screen slide view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">FULLSCREEN</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-1.5 bg-neo-yellow hover:bg-neo-mint text-black border-2 border-black font-heavy text-xs uppercase brutal-shadow-xs cursor-pointer flex items-center space-x-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>SAVE DECK</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-black text-white hover:bg-neo-pink hover:text-black border border-black cursor-pointer transition-colors"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Studio Workspace: Split 3 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Filmstrip & Slides Navigator */}
          {isFilmstripCollapsed ? (
            <div className="w-10 bg-[#0A0C12] border-r-3 border-black flex flex-col items-center py-3 space-y-4 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setIsFilmstripCollapsed(false)}
                className="p-1.5 bg-neo-yellow text-black border border-black hover:bg-neo-mint cursor-pointer"
                title="Expand Slides Filmstrip"
              >
                <PanelLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <div className="text-[10px] font-bold text-slate-500 -rotate-90 whitespace-nowrap mt-8 tracking-wider">
                SLIDES ({currentDeck.slides.length})
              </div>
            </div>
          ) : (
            <div className="w-56 sm:w-64 bg-[#0E1017] border-r-3 border-black flex flex-col justify-between overflow-hidden shrink-0">
              {/* Filmstrip Header */}
              <div className="p-3 border-b-2 border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-400 shrink-0">
                <span className="uppercase text-neo-cyan font-black">SLIDES ({currentDeck.slides.length})</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-500">#{selectedSlideIndex + 1} ACTIVE</span>
                  <button
                    type="button"
                    onClick={() => setIsFilmstripCollapsed(true)}
                    className="p-0.5 hover:text-neo-yellow text-slate-400 cursor-pointer"
                    title="Collapse Slides Filmstrip"
                  >
                    <PanelLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            {/* Slides List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {currentDeck.slides.map((s, idx) => {
                const isActive = idx === selectedSlideIndex;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      playClickSound();
                      setSelectedSlideIndex(idx);
                      setAnimationTriggerKey((k) => k + 1);
                    }}
                    className={`p-2 border-2 text-left cursor-pointer transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-neo-yellow text-black border-black brutal-shadow-xs font-heavy'
                        : 'bg-[#181C28] text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-[#202535]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className={`w-5 h-5 border border-black text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-black text-white' : 'bg-slate-700 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="truncate font-bold text-xs">
                          {s.title || `Slide ${idx + 1}`}
                        </div>
                        <div
                          className={`text-[9px] uppercase font-mono ${
                            isActive ? 'text-black/70' : 'text-slate-400'
                          }`}
                        >
                          {s.type === 'custom' ? '🎨 Custom' : s.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSlide(idx, 'down');
                        }}
                        disabled={idx === currentDeck.slides.length - 1}
                        className="p-0.5 hover:text-black disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSlide(idx);
                        }}
                        className="p-0.5 hover:text-black cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {currentDeck.slides.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSlide(idx);
                          }}
                          className="p-0.5 text-red-400 hover:text-red-700 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Slide Footer */}
            <div className="p-2 border-t-2 border-slate-800 bg-[#0A0C12] shrink-0 space-y-1.5 font-mono">
              <button
                type="button"
                onClick={() => handleAddSlide('custom')}
                className="w-full py-2 bg-gradient-to-r from-neo-yellow to-neo-mint hover:from-neo-mint hover:to-neo-cyan text-black font-heavy text-xs uppercase border-2 border-black brutal-shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>+ CUSTOM BLANK SLIDE</span>
              </button>

              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {(['content', 'code', 'stat', 'quote'] as SlideType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleAddSlide(t)}
                    className="p-1 bg-[#1A1E2B] hover:bg-neo-yellow hover:text-black text-slate-300 border border-slate-700 text-[10px] font-mono font-bold uppercase cursor-pointer text-center truncate"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

          {/* Center Column: Live Interactive Slide Stage */}
          <div className="flex-1 flex flex-col bg-[#0A0C14] overflow-hidden border-r-3 border-black">
            {/* Stage Bar */}
            <div className="px-3 py-2 bg-[#12151F] border-b-2 border-black flex items-center justify-between text-xs font-mono shrink-0 gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsFilmstripCollapsed((v) => !v)}
                  className={`px-2 py-1 border-2 border-black font-mono font-bold text-[11px] uppercase flex items-center space-x-1 cursor-pointer transition-colors ${
                    isFilmstripCollapsed
                      ? 'bg-neo-yellow text-black'
                      : 'bg-[#1E2333] hover:bg-slate-700 text-slate-200'
                  }`}
                  title={isFilmstripCollapsed ? 'Show Slides Filmstrip' : 'Hide Slides Filmstrip'}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isFilmstripCollapsed ? 'SLIDES' : 'HIDE'}</span>
                </button>

                <span className="px-2 py-0.5 bg-black text-neo-yellow font-black border border-slate-700 shrink-0 text-[10px] sm:text-xs">
                  SLIDE {selectedSlideIndex + 1}/{currentDeck.slides.length}
                </span>

                <span className="font-bold text-white truncate max-w-[120px] sm:max-w-xs text-[11px] sm:text-xs">
                  {currentSlide.title || 'Untitled Slide'}
                </span>

                <span className="hidden lg:inline-block px-1.5 py-0.5 bg-[#1B2030] text-neo-cyan text-[10px] uppercase font-bold border border-slate-700 shrink-0">
                  {currentSlide.type === 'custom' ? 'Modular Canvas' : currentSlide.type}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Zoom Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setZoomMode((m) => (m === 'fit' ? '100%' : 'fit'))}
                  className="px-2 py-1 bg-[#1A1E2B] hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-[10px] uppercase cursor-pointer"
                  title="Toggle Zoom: Auto-Fit vs 100%"
                >
                  {zoomMode === 'fit' ? `FIT (${Math.round(previewScale * 100)}%)` : '100%'}
                </button>

                {/* Replay Animation */}
                <button
                  type="button"
                  onClick={handleReplayAnimation}
                  className="px-2.5 py-1 bg-neo-yellow hover:bg-neo-mint text-black font-heavy text-xs uppercase border-2 border-black brutal-shadow-xs flex items-center space-x-1 cursor-pointer transition-all hover:scale-105"
                  title="Replay entry animation"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden md:inline">REPLAY</span>
                </button>

                {/* Focus / Inspector Toggle */}
                <button
                  type="button"
                  onClick={() => setIsInspectorCollapsed((v) => !v)}
                  className={`px-2 py-1 border-2 border-black font-mono font-bold text-[11px] uppercase flex items-center space-x-1 cursor-pointer transition-colors ${
                    isInspectorCollapsed
                      ? 'bg-neo-cyan text-black'
                      : 'bg-[#1E2333] hover:bg-slate-700 text-slate-200'
                  }`}
                  title={isInspectorCollapsed ? 'Show Inspector Panel' : 'Focus Stage (Hide Inspector)'}
                >
                  <span className="hidden sm:inline">{isInspectorCollapsed ? 'INSPECTOR' : 'FOCUS'}</span>
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stage Frame (16:9 Scaled Virtual Canvas) */}
            <div
              ref={stageRef}
              className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative bg-[#07080D]"
            >
              <div
                style={{
                  width: `${stageBoxWidth}px`,
                  height: `${stageBoxHeight}px`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
                className="border-4 border-black brutal-shadow-lg relative overflow-hidden bg-black flex flex-col shrink-0"
              >
                <div
                  style={{
                    width: `${BASE_WIDTH}px`,
                    height: `${BASE_HEIGHT}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  <SlideRenderer
                    slide={currentSlide}
                    slideNumber={selectedSlideIndex + 1}
                    totalSlides={currentDeck.slides.length}
                    animationTriggerKey={animationTriggerKey}
                    isFullscreen={false}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Bar / Speaker Notes */}
            <div className="px-4 py-2 bg-[#0E1017] border-t-2 border-black flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
              <div className="flex items-center space-x-2 truncate">
                <span className="text-neo-mint font-bold uppercase">THEME: {currentSlide.canvasTheme || 'retro-grid'}</span>
                <span>•</span>
                <span className="text-neo-cyan font-bold uppercase">TRANSITION: {currentSlide.transition || 'arcade-pop'}</span>
                <span>•</span>
                <span className="text-neo-yellow font-bold uppercase">SCALE: {Math.round(previewScale * 100)}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 hidden sm:inline">COMPLETE PREVIEW // 16:9 WYSIWYG CANVAS</span>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Inspector Panel */}
          {isInspectorCollapsed ? (
            <div className="w-10 bg-[#0D0F15] border-l-3 border-black flex flex-col items-center py-3 space-y-4 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setIsInspectorCollapsed(false)}
                className="p-1.5 bg-neo-cyan text-black border border-black hover:bg-neo-yellow cursor-pointer"
                title="Expand Inspector Panel"
              >
                <PanelRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <div className="text-[10px] font-bold text-slate-500 rotate-90 whitespace-nowrap mt-8 tracking-wider">
                INSPECTOR
              </div>
            </div>
          ) : (
            <div className="w-80 sm:w-96 md:w-[420px] bg-[#151822] border-l-3 border-black flex flex-col overflow-hidden shrink-0 font-mono">
              {/* Inspector Tab Switcher */}
              <div className="flex items-center bg-[#0D0F15] border-b-3 border-black text-xs font-heavy uppercase shrink-0">
                <div className="flex-1 grid grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('content');
                    }}
                    className={`py-2.5 px-2 flex items-center justify-center space-x-1 border-r-2 border-black cursor-pointer transition-colors ${
                      activeTab === 'content'
                        ? 'bg-neo-yellow text-black font-black'
                        : 'bg-[#181C28] text-slate-300 hover:bg-[#202535]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CONTENT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('design');
                    }}
                    className={`py-2.5 px-2 flex items-center justify-center space-x-1 border-r-2 border-black cursor-pointer transition-colors ${
                      activeTab === 'design'
                        ? 'bg-neo-cyan text-black font-black'
                        : 'bg-[#181C28] text-slate-300 hover:bg-[#202535]'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>DESIGN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActiveTab('animations');
                    }}
                    className={`py-2.5 px-2 flex items-center justify-center space-x-1 cursor-pointer transition-colors ${
                      activeTab === 'animations'
                        ? 'bg-neo-pink text-white font-black'
                        : 'bg-[#181C28] text-slate-300 hover:bg-[#202535]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ANIMATION</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsInspectorCollapsed(true)}
                  className="p-2.5 hover:text-neo-yellow text-slate-400 border-l-2 border-black cursor-pointer transition-colors"
                  title="Collapse Inspector Panel"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
              </div>

            {/* Inspector Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 text-xs">
              {/* TAB 1: CONTENT */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  {/* Preset Slide Conversion Banner */}
                  {currentSlide.type !== 'custom' && (
                    <div className="p-3 bg-[#1A1828] border-2 border-black brutal-shadow-pink space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-heavy text-neo-pink uppercase text-[11px]">
                          CURRENT MODE: {currentSlide.type.toUpperCase()} PRESET
                        </span>
                        <span className="text-[10px] text-slate-400">Structured</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        Convert this preset into independent modular blocks to freely reposition elements and mix text, code, stats, and live polls.
                      </p>
                      <button
                        type="button"
                        onClick={handleConvertPresetToCustom}
                        className="w-full py-1.5 bg-neo-cyan hover:bg-neo-yellow text-black border-2 border-black font-heavy uppercase text-xs brutal-shadow-xs cursor-pointer flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>CONVERT TO CUSTOM BLOCKS</span>
                      </button>
                    </div>
                  )}

                  {/* Title & Subtitle for preset slides */}
                  {currentSlide.type !== 'custom' ? (
                    <div className="space-y-3 bg-[#181C28] p-3 border-2 border-black">
                      <div>
                        <label className="block text-[11px] font-heavy uppercase text-neo-yellow mb-1">
                          SLIDE TITLE
                        </label>
                        <input
                          type="text"
                          value={currentSlide.title}
                          onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                          className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-yellow select-text"
                          placeholder="Slide Title..."
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-heavy uppercase text-slate-300 mb-1">
                          SUBTITLE / CAPTION
                        </label>
                        <input
                          type="text"
                          value={currentSlide.subtitle || ''}
                          onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                          className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold focus:outline-none focus:border-neo-yellow select-text"
                          placeholder="Optional subtitle..."
                        />
                      </div>

                      {/* Bullets for content slide */}
                      {currentSlide.type === 'content' && (
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                          <label className="block text-[11px] font-heavy uppercase text-neo-mint">
                            BULLET POINTS
                          </label>
                          {(currentSlide.bullets || []).map((b, bIdx) => (
                            <div key={bIdx} className="flex items-center space-x-1">
                              <input
                                type="text"
                                value={b}
                                onChange={(e) => {
                                  const nextBullets = [...(currentSlide.bullets || [])];
                                  nextBullets[bIdx] = e.target.value;
                                  updateCurrentSlide({ bullets: nextBullets });
                                }}
                                className="flex-1 p-1.5 bg-[#0E1017] border border-black text-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (currentSlide.bullets || []).filter((_, i) => i !== bIdx);
                                  updateCurrentSlide({ bullets: next });
                                }}
                                className="p-1 text-red-400 hover:text-red-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(currentSlide.bullets || []), 'New key takeaway bullet'];
                              updateCurrentSlide({ bullets: next });
                            }}
                            className="text-[10px] text-neo-mint font-bold uppercase hover:underline flex items-center space-x-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Bullet Point</span>
                          </button>
                        </div>
                      )}

                      {/* Code Snippet for code slide */}
                      {currentSlide.type === 'code' && (
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                          <label className="block text-[11px] font-heavy uppercase text-neo-yellow">
                            CODE SNIPPET
                          </label>
                          <textarea
                            value={currentSlide.codeSnippet || ''}
                            onChange={(e) => updateCurrentSlide({ codeSnippet: e.target.value })}
                            rows={5}
                            className="w-full p-2 bg-[#0E1017] border border-black text-neo-mint font-mono text-xs focus:outline-none"
                          />
                        </div>
                      )}

                      {/* Metric value for stat slide */}
                      {currentSlide.type === 'stat' && (
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                          <div>
                            <label className="block text-[11px] font-heavy uppercase text-neo-mint mb-1">
                              METRIC VALUE (HERO)
                            </label>
                            <input
                              type="text"
                              value={currentSlide.statValue || ''}
                              onChange={(e) => updateCurrentSlide({ statValue: e.target.value })}
                              className="w-full p-1.5 bg-[#0E1017] border border-black text-white text-xs font-bold"
                              placeholder="e.g. 99.99%"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-heavy uppercase text-slate-300 mb-1">
                              STAT LABEL
                            </label>
                            <input
                              type="text"
                              value={currentSlide.statLabel || ''}
                              onChange={(e) => updateCurrentSlide({ statLabel: e.target.value })}
                              className="w-full p-1.5 bg-[#0E1017] border border-black text-white text-xs"
                              placeholder="e.g. Cluster Uptime"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* CUSTOM SLIDE: MODULAR BLOCK BUILDER */
                    <div className="space-y-3">
                      {/* Add Element Palette */}
                      <div className="bg-[#181C28] p-3 border-2 border-black space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-heavy text-[11px] uppercase text-neo-yellow flex items-center space-x-1">
                            <Plus className="w-3.5 h-3.5" />
                            <span>ADD MODULAR ELEMENT:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {(currentSlide.blocks || []).length} Blocks
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddBlock('heading')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Heading className="w-3.5 h-3.5 text-neo-yellow" />
                            <span>Heading</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('text')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Type className="w-3.5 h-3.5 text-neo-mint" />
                            <span>Text / Bullets</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('image')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-neo-cyan" />
                            <span>Image URL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('code')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Code2 className="w-3.5 h-3.5 text-neo-pink" />
                            <span>Code Snippet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('stat')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-neo-mint" />
                            <span>Metric Stat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('quote')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Quote className="w-3.5 h-3.5 text-neo-yellow" />
                            <span>Pull Quote</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('quiz')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-neo-cyan" />
                            <span>Live Quiz</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('poll')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-neo-pink" />
                            <span>Live Poll</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('badge')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5 text-neo-yellow" />
                            <span>Badge Tag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('button')}
                            className="p-1.5 bg-[#222736] hover:bg-neo-yellow hover:text-black text-slate-200 border border-slate-700 font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-neo-mint" />
                            <span>Action Link</span>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Block Items */}
                      <div className="space-y-2">
                        {(currentSlide.blocks || []).length === 0 ? (
                          <div className="p-4 bg-[#181C28] border-2 border-dashed border-slate-700 text-center text-slate-400 space-y-1">
                            <Sparkles className="w-5 h-5 mx-auto text-neo-yellow" />
                            <div className="font-bold">Blank Slide Canvas</div>
                            <div className="text-[10px]">Click any element button above to place text, code, or widgets.</div>
                          </div>
                        ) : (
                          (currentSlide.blocks || []).map((block, bIdx) => {
                            const isExpanded = expandedBlockId === block.id;
                            return (
                              <div
                                key={block.id}
                                className="bg-[#181C28] border-2 border-black brutal-shadow-xs overflow-hidden"
                              >
                                {/* Block Accordion Header */}
                                <div
                                  onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                                  className="p-2.5 bg-[#202535] hover:bg-[#282F45] cursor-pointer flex items-center justify-between select-none"
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    <ChevronRight
                                      className={`w-3.5 h-3.5 transition-transform ${
                                        isExpanded ? 'rotate-90 text-neo-yellow' : 'text-slate-400'
                                      }`}
                                    />
                                    <span className="px-1.5 py-0.5 bg-black text-neo-mint text-[9px] font-black uppercase border border-slate-700">
                                      {block.type}
                                    </span>
                                    <span className="font-bold text-xs truncate max-w-[140px]">
                                      {block.text || block.headingText || block.statValue || block.codeLanguage || block.quizQuestion || block.pollQuestion || block.badgeText || `Block ${bIdx + 1}`}
                                    </span>
                                  </div>

                                  <div
                                    className="flex items-center space-x-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextCol = (((block.column ?? 0) + 1) % 3) as number;
                                        updateBlock(block.id, { column: nextCol });
                                      }}
                                      className="px-1.5 py-0.5 bg-black text-neo-cyan text-[9px] font-bold border border-slate-700 hover:border-neo-cyan cursor-pointer"
                                      title="Switch Column"
                                    >
                                      Col {(block.column ?? 0) + 1}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => moveBlock(block.id, 'up')}
                                      disabled={bIdx === 0}
                                      className="p-1 hover:text-neo-yellow disabled:opacity-20 cursor-pointer"
                                    >
                                      <MoveUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveBlock(block.id, 'down')}
                                      disabled={bIdx === (currentSlide.blocks || []).length - 1}
                                      className="p-1 hover:text-neo-yellow disabled:opacity-20 cursor-pointer"
                                    >
                                      <MoveDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteBlock(block.id)}
                                      className="p-1 text-red-400 hover:text-red-200 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Block Settings */}
                                {isExpanded && (
                                  <div className="p-3 border-t border-slate-800 space-y-2.5 bg-[#141722]">
                                    {/* Type Specific Form */}
                                    {block.type === 'heading' && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center space-x-2">
                                          <label className="text-[10px] text-slate-400 font-bold uppercase">Size:</label>
                                          {[1, 2, 3].map((lvl) => (
                                            <button
                                              key={lvl}
                                              type="button"
                                              onClick={() => updateBlock(block.id, { level: lvl as 1 | 2 | 3 })}
                                              className={`px-2 py-0.5 text-[10px] font-bold border ${
                                                (block.level || 1) === lvl
                                                  ? 'bg-neo-yellow text-black border-black'
                                                  : 'bg-black text-slate-300 border-slate-700'
                                              }`}
                                            >
                                              H{lvl}
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          type="text"
                                          value={block.text || ''}
                                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                          placeholder="Heading text..."
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs font-bold"
                                        />
                                      </div>
                                    )}

                                    {block.type === 'text' && (
                                      <div className="space-y-1.5">
                                        <textarea
                                          value={block.text || ''}
                                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                          placeholder="Paragraph text..."
                                          rows={3}
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                      </div>
                                    )}

                                    {block.type === 'image' && (
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          value={block.imageUrl || ''}
                                          onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
                                          placeholder="https://image-url..."
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                        <input
                                          type="text"
                                          value={block.imageCaption || ''}
                                          onChange={(e) => updateBlock(block.id, { imageCaption: e.target.value })}
                                          placeholder="Image caption..."
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                      </div>
                                    )}

                                    {block.type === 'code' && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase">Language:</span>
                                          <input
                                            type="text"
                                            value={block.codeLanguage || 'typescript'}
                                            onChange={(e) => updateBlock(block.id, { codeLanguage: e.target.value })}
                                            className="p-1 bg-[#0A0C12] border border-black text-neo-mint text-[10px] font-mono"
                                          />
                                        </div>
                                        <textarea
                                          value={block.codeSnippet || ''}
                                          onChange={(e) => updateBlock(block.id, { codeSnippet: e.target.value })}
                                          rows={4}
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-neo-mint font-mono text-xs"
                                        />
                                      </div>
                                    )}

                                    {block.type === 'stat' && (
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          value={block.statValue || ''}
                                          onChange={(e) => updateBlock(block.id, { statValue: e.target.value })}
                                          placeholder="Value (e.g. 99.9%)"
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs font-bold"
                                        />
                                        <input
                                          type="text"
                                          value={block.statLabel || ''}
                                          onChange={(e) => updateBlock(block.id, { statLabel: e.target.value })}
                                          placeholder="Label (e.g. Uptime)"
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                      </div>
                                    )}

                                    {block.type === 'quote' && (
                                      <div className="space-y-1.5">
                                        <textarea
                                          value={block.quoteText || ''}
                                          onChange={(e) => updateBlock(block.id, { quoteText: e.target.value })}
                                          placeholder="Quote text..."
                                          rows={2}
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                        <input
                                          type="text"
                                          value={block.quoteAuthor || ''}
                                          onChange={(e) => updateBlock(block.id, { quoteAuthor: e.target.value })}
                                          placeholder="Author name..."
                                          className="w-full p-1.5 bg-[#0A0C12] border border-black text-white text-xs"
                                        />
                                      </div>
                                    )}

                                    {/* Card Container Style & Alignment */}
                                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Card Style:</span>
                                        <div className="flex space-x-1">
                                          {(['transparent', 'card-dark', 'card-yellow', 'card-cyan', 'card-mint'] as const).map((cs) => (
                                            <button
                                              key={cs}
                                              type="button"
                                              onClick={() => updateBlock(block.id, { cardStyle: cs })}
                                              className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                                                (block.cardStyle || 'transparent') === cs
                                                  ? 'bg-neo-yellow text-black border-black font-black'
                                                  : 'bg-black text-slate-400 border-slate-800'
                                              }`}
                                            >
                                              {cs.replace('card-', '')}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Micro Offset X/Y */}
                                      <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                          <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-0.5">
                                            <span>Offset X</span>
                                            <span>{block.offsetX || 0}px</span>
                                          </div>
                                          <input
                                            type="range"
                                            min={-60}
                                            max={60}
                                            step={2}
                                            value={block.offsetX || 0}
                                            onChange={(e) => updateBlock(block.id, { offsetX: Number(e.target.value) })}
                                            className="w-full accent-neo-cyan"
                                          />
                                        </div>
                                        <div>
                                          <div className="flex justify-between text-[9px] text-slate-400 font-bold mb-0.5">
                                            <span>Offset Y</span>
                                            <span>{block.offsetY || 0}px</span>
                                          </div>
                                          <input
                                            type="range"
                                            min={-60}
                                            max={60}
                                            step={2}
                                            value={block.offsetY || 0}
                                            onChange={(e) => updateBlock(block.id, { offsetY: Number(e.target.value) })}
                                            className="w-full accent-neo-pink"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DESIGN & THEME */}
              {activeTab === 'design' && (
                <div className="space-y-4">
                  {/* Canvas Theme Swatches */}
                  <div className="bg-[#181C28] p-3 border-2 border-black space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-heavy text-[11px] uppercase text-neo-mint flex items-center space-x-1">
                        <Palette className="w-3.5 h-3.5" />
                        <span>CANVAS THEME SWATCH:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        {currentSlide.canvasTheme || 'retro-grid'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {CANVAS_THEMES.map((theme) => {
                        const isActive = (currentSlide.canvasTheme || 'retro-grid') === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              updateCurrentSlide({ canvasTheme: theme.id });
                            }}
                            className={`p-2 border-2 text-left flex flex-col justify-between h-14 cursor-pointer transition-all ${theme.bgClass} ${theme.borderClass} ${
                              isActive ? 'ring-3 ring-neo-yellow ring-offset-2 ring-offset-[#181C28] font-black' : 'hover:scale-105'
                            }`}
                          >
                            <span className={`text-[10px] font-black uppercase truncate ${theme.textClass}`}>
                              {theme.label}
                            </span>
                            {isActive && (
                              <span className="self-end px-1 bg-black text-white text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid Layout Selector */}
                  <div className="bg-[#181C28] p-3 border-2 border-black space-y-2">
                    <div className="flex items-center space-x-1 font-heavy text-[11px] uppercase text-neo-cyan">
                      <Columns className="w-3.5 h-3.5" />
                      <span>COLUMN GRID LAYOUT:</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {(
                        [
                          { id: 'single', label: '1-Column Full Stage' },
                          { id: 'split-2', label: '2-Col Split (50 / 50)' },
                          { id: 'grid-3', label: '3-Col Grid (33 / 33 / 33)' },
                          { id: 'asymmetric-left', label: 'Asymmetric Left (60 / 40)' },
                          { id: 'asymmetric-right', label: 'Asymmetric Right (40 / 60)' },
                        ] as { id: SlideLayoutType; label: string }[]
                      ).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            updateCurrentSlide({ layout: l.id });
                          }}
                          className={`p-2 border text-left text-xs font-bold uppercase cursor-pointer transition-all flex items-center justify-between ${
                            (currentSlide.layout || 'single') === l.id
                              ? 'bg-neo-cyan text-black border-black font-black brutal-shadow-xs'
                              : 'bg-[#222736] text-slate-300 border-slate-700 hover:border-neo-cyan'
                          }`}
                        >
                          <span>{l.label}</span>
                          {(currentSlide.layout || 'single') === l.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speaker Notes */}
                  <div className="bg-[#181C28] p-3 border-2 border-black space-y-1.5">
                    <label className="block text-[11px] font-heavy uppercase text-slate-300">
                      SPEAKER NOTES & CUES:
                    </label>
                    <textarea
                      value={currentSlide.speakerNotes || ''}
                      onChange={(e) => updateCurrentSlide({ speakerNotes: e.target.value })}
                      placeholder="Private presenter notes visible in presenter overlay..."
                      rows={3}
                      className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-sans resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: ANIMATIONS & PRESETS */}
              {activeTab === 'animations' && (
                <div className="space-y-4">
                  {/* Prebuilt Animation Bundles */}
                  <div className="bg-[#181C28] p-3 border-2 border-black space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neo-yellow fill-neo-yellow" />
                      <span className="font-heavy text-[11px] uppercase text-neo-yellow">
                        1-CLICK ANIMATION BUNDLES:
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ANIMATION_BUNDLES.map((bundle) => {
                        const isSelected =
                          currentSlide.animationPreset === bundle.id ||
                          (currentSlide.transition === bundle.transition &&
                            currentSlide.elementAnimation === bundle.elementAnimation);
                        return (
                          <div
                            key={bundle.id}
                            onClick={() => handleApplyAnimationBundle(bundle)}
                            className={`p-2.5 border-2 text-left cursor-pointer transition-all ${
                              isSelected
                                ? `${bundle.colorClass} brutal-shadow-xs font-black`
                                : 'bg-[#202535] hover:bg-[#282F45] text-slate-200 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-heavy text-xs uppercase tracking-tight">
                                {bundle.label}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-black text-white font-bold uppercase">
                                {bundle.badge}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-80 leading-snug">
                              {bundle.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Custom Controls */}
                  <div className="bg-[#181C28] p-3 border-2 border-black space-y-3">
                    <div className="flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-neo-cyan" />
                      <span className="font-heavy text-[11px] uppercase text-neo-cyan">
                        CUSTOM TIMING & EFFECTS:
                      </span>
                    </div>

                    {/* Transition Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Slide Transition:
                      </label>
                      <select
                        value={currentSlide.transition || 'arcade-pop'}
                        onChange={(e) => {
                          updateCurrentSlide({
                            transition: e.target.value as SlideTransitionType,
                            animationPreset: 'custom',
                          });
                          setAnimationTriggerKey((k) => k + 1);
                        }}
                        className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold"
                      >
                        {TRANSITION_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label} — {opt.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Element Entrance Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Element Entrance Reveal:
                      </label>
                      <select
                        value={currentSlide.elementAnimation || 'pop-in'}
                        onChange={(e) => {
                          updateCurrentSlide({
                            elementAnimation: e.target.value as ElementAnimationType,
                            animationPreset: 'custom',
                          });
                          setAnimationTriggerKey((k) => k + 1);
                        }}
                        className="w-full p-2 bg-[#0E1017] border border-black text-white text-xs font-bold"
                      >
                        {ELEMENT_ANIMATION_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label} — {opt.desc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Duration Slider */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                        <span>TRANSITION DURATION:</span>
                        <span className="text-neo-yellow">
                          {(currentSlide.animationDuration ?? 0.45).toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.5}
                        step={0.05}
                        value={currentSlide.animationDuration ?? 0.45}
                        onChange={(e) => {
                          updateCurrentSlide({
                            animationDuration: Number(e.target.value),
                            animationPreset: 'custom',
                          });
                        }}
                        className="w-full accent-neo-yellow cursor-pointer"
                      />
                    </div>

                    {/* Stagger Delay Slider */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                        <span>ELEMENT STAGGER DELAY:</span>
                        <span className="text-neo-mint">
                          {(currentSlide.animationDelay ?? 0.08).toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={0.3}
                        step={0.02}
                        value={currentSlide.animationDelay ?? 0.08}
                        onChange={(e) => {
                          updateCurrentSlide({
                            animationDelay: Number(e.target.value),
                            animationPreset: 'custom',
                          });
                        }}
                        className="w-full accent-neo-mint cursor-pointer"
                      />
                    </div>

                    {/* Test Play Neon Button */}
                    <button
                      type="button"
                      onClick={handleReplayAnimation}
                      className="w-full py-2 bg-neo-yellow hover:bg-neo-mint text-black border-2 border-black font-heavy uppercase text-xs brutal-shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>TEST PLAY ANIMATION</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>

      {/* Fullscreen Live Preview Modal */}
      {showFullscreenPreview && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col justify-between">
          <div className="p-3 bg-[#0D0F15] border-b-2 border-black flex items-center justify-between text-xs font-mono text-white">
            <span className="font-heavy text-neo-yellow">
              SLIDE PREVIEW // {selectedSlideIndex + 1} OF {currentDeck.slides.length}
            </span>
            <button
              type="button"
              onClick={() => setShowFullscreenPreview(false)}
              className="px-3 py-1 bg-neo-pink text-black font-heavy uppercase border-2 border-black cursor-pointer"
            >
              EXIT FULLSCREEN
            </button>
          </div>

          <div className="flex-1 w-full h-full">
            <SlideRenderer
              slide={currentSlide}
              slideNumber={selectedSlideIndex + 1}
              totalSlides={currentDeck.slides.length}
              animationTriggerKey={animationTriggerKey}
              isFullscreen={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
