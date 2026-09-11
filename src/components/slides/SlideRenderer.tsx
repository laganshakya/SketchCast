import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Code2,
  TrendingUp,
  Quote,
  Sparkles,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ImageIcon,
  Clock,
  Flame,
  Vote,
  XCircle,
  Play,
  Award,
} from 'lucide-react';
import type {
  Slide,
  SlideBlock,
  QuizRoundState,
  QuizQuestion,
  LivePoll,
} from '../../types';
import { playClickSound, playPopSound } from '../../lib/soundFx';
import { getCanvasThemeClasses } from '../../lib/slides/slideThemes';
import {
  getSlideTransitionVariants,
  getElementAnimationProps,
} from '../../lib/slides/slideAnimations';

interface SlideRendererProps {
  slide: Slide;
  slideNumber?: number;
  totalSlides?: number;
  isFullscreen?: boolean;
  isHost?: boolean;
  animationTriggerKey?: string | number;
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
  onActivateQuiz?: (questionId?: string) => void;
  onActivatePoll?: (pollId?: string) => void;
}

const OPTION_COLORS = [
  { bg: 'bg-neo-yellow', text: 'text-black', border: 'border-black' },
  { bg: 'bg-neo-cyan', text: 'text-black', border: 'border-black' },
  { bg: 'bg-neo-pink', text: 'text-black', border: 'border-black' },
  { bg: 'bg-neo-mint', text: 'text-black', border: 'border-black' },
];

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  slideNumber,
  totalSlides,
  isFullscreen = false,
  isHost = false,
  animationTriggerKey,
  quizState,
  timeRemaining,
  userStreak = 0,
  onStartQuizRound,
  onRevealQuizAnswer,
  onSelectQuizOption,
  polls = [],
  userPollVotes = {},
  onVoteOnPoll,
  onCreatePoll,
  onActivateQuiz,
  onActivatePoll,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [imgError, setImgError] = useState(false);

  const themeConfig = getCanvasThemeClasses(slide.canvasTheme);
  const isLight = themeConfig.isLight;

  const handleCopyCode = (text?: string) => {
    const snippet = text || slide.codeSnippet;
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const renderSlideImage = (imageUrl?: string, caption?: string, className: string = '') => {
    const url = imageUrl || slide.imageUrl;
    if (!url) return null;
    if (imgError) {
      return (
        <div className={`p-4 bg-black/40 border-2 border-dashed border-slate-600 text-slate-400 font-mono text-xs flex flex-col items-center justify-center ${className}`}>
          <ImageIcon className="w-6 h-6 mb-1 text-slate-500" />
          <span>Image preview unavailable</span>
        </div>
      );
    }
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="border-3 border-black brutal-shadow-sm overflow-hidden bg-black/10">
          <img
            src={url}
            alt={caption || slide.imageCaption || slide.title}
            onError={() => setImgError(true)}
            className="w-full h-auto object-cover max-h-[38vh]"
          />
        </div>
        {(caption || slide.imageCaption) && (
          <span className={`text-[11px] font-mono font-bold mt-1 text-left ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
            ▲ {caption || slide.imageCaption}
          </span>
        )}
      </div>
    );
  };

  const renderSlideLink = (url?: string, label?: string) => {
    const link = url || slide.linkUrl;
    if (!link) return null;
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-neo-cyan hover:bg-neo-yellow text-black border-2 border-black font-mono font-bold text-xs uppercase brutal-shadow-xs transition-colors mt-2.5 cursor-pointer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{label || slide.linkLabel || 'Reference Link'}</span>
      </a>
    );
  };

  // Helper to render interactive Quiz component (shared across preset and custom block)
  const renderQuizElement = (
    qText?: string,
    opts?: string[],
    correctIndex?: number,
    timeLimit?: number,
    explanation?: string,
    subtitle?: string
  ) => {
    const questionText = qText || (slide.type === 'custom' ? 'Interactive Trivia' : (slide.quizQuestion || slide.title));
    const options = opts && opts.length > 0 ? opts : (slide.quizOptions && slide.quizOptions.length > 0 ? slide.quizOptions : ['Option A', 'Option B', 'Option C', 'Option D']);
    const correctIdx = typeof correctIndex === 'number' ? correctIndex : (typeof slide.quizCorrectIndex === 'number' ? slide.quizCorrectIndex : 0);
    const limit = timeLimit || slide.quizTimeLimitSeconds || 20;
    const expl = explanation || slide.quizExplanation;
    const isRoundActive = Boolean(quizState?.isActive);
    const isRevealed = Boolean(quizState?.isRevealed);
    const userSelected = quizState?.userSelectedOption;

    const handleStartQuiz = () => {
      playClickSound();
      if (onStartQuizRound) {
        const quizPayload: QuizQuestion = {
          id: slide.id,
          category: 'Slide Trivia',
          question: questionText,
          options: options.map((opt, i) => ({
            id: ['A', 'B', 'C', 'D'][i] || `opt-${i}`,
            text: opt,
          })),
          correctOptionId: ['A', 'B', 'C', 'D'][correctIdx] || 'A',
          timeLimitSeconds: limit,
          explanation: expl || 'Correct answer verified by slide host.',
        };
        onStartQuizRound(quizPayload);
      } else if (onActivateQuiz) {
        onActivateQuiz(slide.embeddedQuizQuestionId);
      }
    };

    const handleOptionClick = (optId: string) => {
      if (!isRoundActive || isRevealed || userSelected) return;
      playPopSound();
      if (onSelectQuizOption) {
        onSelectQuizOption(optId);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="flex items-center space-x-2 mb-2 flex-wrap justify-center">
          <span className="px-2.5 py-0.5 bg-neo-pink text-black border-2 border-black font-mono font-black text-xs uppercase brutal-shadow-xs flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ARENA QUIZ CHALLENGE</span>
          </span>
          {isRoundActive && typeof timeRemaining === 'number' && (
            <span className={`px-2.5 py-0.5 border-2 border-black font-mono font-black text-xs uppercase brutal-shadow-xs flex items-center space-x-1 ${
              timeRemaining <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-neo-yellow text-black'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeRemaining}S REMAINING</span>
            </span>
          )}
          {userStreak > 1 && (
            <span className="px-2 py-0.5 bg-neo-mint text-black border-2 border-black font-mono font-black text-xs uppercase flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-orange-600" />
              <span>{userStreak}x STREAK</span>
            </span>
          )}
        </div>

        <h2 className={`font-heavy uppercase tracking-tight leading-tight max-w-3xl ${
          isLight ? 'text-black' : 'text-white'
        } ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'}`}>
          {questionText}
        </h2>
        {subtitle && !isRoundActive && (
          <p className={`text-xs sm:text-sm font-bold mt-1 max-w-xl ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
            {subtitle}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-2xl mt-4 font-mono">
          {options.slice(0, 4).map((opt, i) => {
            const optKey = ['A', 'B', 'C', 'D'][i];
            const isSelected = userSelected === optKey;
            const isCorrectOption = isRevealed && i === correctIdx;
            const isWrongSelected = isRevealed && isSelected && i !== correctIdx;
            const colorConfig = OPTION_COLORS[i % OPTION_COLORS.length];

            return (
              <motion.button
                key={optKey}
                whileHover={!isRevealed && isRoundActive && !userSelected ? { scale: 1.02 } : {}}
                whileTap={!isRevealed && isRoundActive && !userSelected ? { scale: 0.98 } : {}}
                onClick={() => handleOptionClick(optKey)}
                disabled={!isRoundActive || isRevealed || Boolean(userSelected)}
                className={`p-3 border-3 border-black text-left flex items-center justify-between brutal-shadow-xs transition-all cursor-pointer disabled:cursor-default ${
                  isCorrectOption
                    ? 'bg-neo-mint text-black ring-4 ring-black font-black'
                    : isWrongSelected
                    ? 'bg-red-200 text-red-900 line-through'
                    : isSelected
                    ? 'bg-black text-white'
                    : `${colorConfig.bg} ${colorConfig.text}`
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`w-7 h-7 rounded-none border-2 border-black flex items-center justify-center font-black text-xs shrink-0 ${
                    isSelected ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    {optKey}
                  </span>
                  <span className="font-bold text-xs sm:text-sm truncate">
                    {opt}
                  </span>
                </div>

                {isCorrectOption ? (
                  <CheckCircle2 className="w-5 h-5 text-black stroke-[3] shrink-0" />
                ) : isWrongSelected ? (
                  <XCircle className="w-5 h-5 text-red-700 stroke-[2.5] shrink-0" />
                ) : isSelected ? (
                  <span className="text-[10px] font-black uppercase px-1 bg-neo-yellow text-black border border-white">
                    VOTED
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {isRevealed && expl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-2.5 bg-neo-yellow/30 border-2 border-black font-mono text-xs font-bold text-black max-w-2xl text-left brutal-shadow-xs"
          >
            <span className="font-black uppercase text-slate-900 mr-1">EXPLANATION:</span>
            {expl}
          </motion.div>
        )}

        {isHost && (
          <div className="flex items-center space-x-2 mt-4">
            {!isRoundActive ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartQuiz}
                className="px-5 py-2.5 bg-neo-yellow hover:bg-neo-mint text-black border-3 border-black font-heavy text-xs sm:text-sm uppercase brutal-shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>START LIVE ROUND ({limit}S)</span>
              </motion.button>
            ) : !isRevealed ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRevealQuizAnswer}
                className="px-5 py-2.5 bg-neo-pink hover:bg-neo-yellow text-black border-3 border-black font-heavy text-xs sm:text-sm uppercase brutal-shadow-md cursor-pointer flex items-center space-x-1.5 animate-pulse"
              >
                <Award className="w-4 h-4" />
                <span>REVEAL CORRECT ANSWER</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartQuiz}
                className="px-4 py-2 bg-slate-100 hover:bg-neo-yellow text-black border-2 border-black font-heavy text-xs uppercase cursor-pointer"
              >
                <span>RESTART ROUND</span>
              </motion.button>
            )}
          </div>
        )}

        {!isHost && !isRoundActive && (
          <div className="mt-4 text-xs font-mono font-bold text-slate-400 animate-pulse">
            ⏳ Waiting for presenter to start this live trivia question...
          </div>
        )}
      </div>
    );
  };

  // Helper to render interactive Poll component (shared across preset and custom block)
  const renderPollElement = (pTitle?: string, pOptions?: string[], subtitle?: string) => {
    const pollTitle = pTitle || (slide.type === 'custom' ? 'Audience Poll' : (slide.pollQuestion || slide.title));
    const optionsList = pOptions && pOptions.length > 0 ? pOptions : (slide.pollOptions && slide.pollOptions.length > 0 ? slide.pollOptions : ['Option A', 'Option B', 'Option C', 'Option D']);

    const activePoll = polls.find(
      (p) => p.id === slide.embeddedPollId || p.question.toLowerCase().trim() === pollTitle.toLowerCase().trim()
    );

    const totalVotes = activePoll
      ? activePoll.options.reduce((sum, o) => sum + (o.votesCount || 0), 0)
      : 0;

    const userVotedOptionId = activePoll ? userPollVotes[activePoll.id] : undefined;

    const handleVoteOption = (optionId: string) => {
      if (!activePoll) return;
      playPopSound();
      if (onVoteOnPoll) {
        onVoteOnPoll(activePoll.id, optionId);
      }
    };

    const handleLaunchPoll = () => {
      playClickSound();
      if (onCreatePoll) {
        onCreatePoll(pollTitle, optionsList);
      } else if (onActivatePoll) {
        onActivatePoll(slide.embeddedPollId);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center text-center w-full">
        <div className="flex items-center space-x-2 mb-2">
          <span className="px-2.5 py-0.5 bg-neo-cyan text-black border-2 border-black font-mono font-black text-xs uppercase brutal-shadow-xs flex items-center space-x-1">
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>LIVE AUDIENCE POLL</span>
          </span>
          {activePoll && (
            <span className="px-2 py-0.5 bg-neo-mint text-black border-2 border-black font-mono font-black text-xs uppercase">
              {totalVotes} {totalVotes === 1 ? 'VOTE' : 'TOTAL VOTES'}
            </span>
          )}
        </div>

        <h2 className={`font-heavy uppercase tracking-tight leading-tight max-w-3xl ${
          isLight ? 'text-black' : 'text-white'
        } ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-base sm:text-xl'}`}>
          {pollTitle}
        </h2>
        {subtitle && (
          <p className={`text-xs sm:text-sm font-bold mt-0.5 max-w-xl ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
            {subtitle}
          </p>
        )}

        <div className={`w-full max-w-2xl font-mono text-left ${
          isFullscreen ? 'mt-4 space-y-2.5' : 'mt-2 space-y-1.5'
        }`}>
          {activePoll
            ? activePoll.options.map((opt, i) => {
                const pct = totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100) : 0;
                const isMyVote = userVotedOptionId === opt.id;
                const colorConfig = OPTION_COLORS[i % OPTION_COLORS.length];

                return (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleVoteOption(opt.id)}
                    className={`w-full border-3 border-black relative overflow-hidden flex flex-col justify-center cursor-pointer brutal-shadow-xs transition-all ${
                      isFullscreen ? 'p-2.5 sm:p-3' : 'p-1.5 sm:p-2'
                    } ${
                      isMyVote ? 'ring-3 ring-black font-black' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`absolute top-0 bottom-0 left-0 ${colorConfig.bg} opacity-40 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />

                    <div className={`relative z-10 flex items-center justify-between ${
                      isFullscreen ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold text-black truncate pr-2">
                        <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{opt.text}</span>
                        {isMyVote && (
                          <span className="px-1.5 py-0.2 bg-neo-pink text-black text-[9px] font-black uppercase border border-black shrink-0">
                            YOUR VOTE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 font-black text-black">
                        <span>{pct}%</span>
                        <span className="text-[10px] text-slate-500">({opt.votesCount})</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            : optionsList.map((optText, i) => (
                <div
                  key={i}
                  className={`w-full border-2 border-black bg-white flex items-center justify-between font-bold text-black ${
                    isFullscreen ? 'p-2.5 sm:p-3 text-xs sm:text-sm' : 'p-1.5 sm:p-2 text-[11px] sm:text-xs'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-slate-200 text-black text-[10px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{optText}</span>
                  </div>
                  <span className="text-slate-400 font-normal text-[10px] sm:text-xs">Ready to vote</span>
                </div>
              ))}
        </div>

        {isHost && !activePoll && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLaunchPoll}
            className={`bg-neo-cyan hover:bg-neo-yellow text-black border-3 border-black font-heavy uppercase brutal-shadow-md cursor-pointer flex items-center space-x-2 ${
              isFullscreen ? 'mt-4 px-5 py-2.5 text-xs sm:text-sm' : 'mt-2 px-3 py-1.5 text-xs'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>LAUNCH THIS LIVE POLL</span>
          </motion.button>
        )}

        {!isHost && !activePoll && (
          <div className="mt-4 text-xs font-mono font-bold text-slate-400 animate-pulse">
            ⏳ Poll ready. Waiting for host to launch live voting...
          </div>
        )}
      </div>
    );
  };

  // Helper to render individual Custom Slide Block
  const renderCustomBlock = (block: SlideBlock, index: number = 0) => {
    const alignClass =
      block.align === 'center'
        ? 'text-center items-center'
        : block.align === 'right'
        ? 'text-right items-end'
        : 'text-left items-start';

    // Container style
    let cardClass = '';
    switch (block.cardStyle) {
      case 'card-dark':
        cardClass = 'p-3.5 sm:p-4 bg-[#151822] text-white border-3 border-black brutal-shadow-sm';
        break;
      case 'card-cream':
        cardClass = 'p-3.5 sm:p-4 bg-[#FFFDF5] text-black border-3 border-black brutal-shadow-sm';
        break;
      case 'card-yellow':
        cardClass = 'p-3.5 sm:p-4 bg-neo-yellow text-black border-3 border-black brutal-shadow-sm';
        break;
      case 'card-cyan':
        cardClass = 'p-3.5 sm:p-4 bg-neo-cyan text-black border-3 border-black brutal-shadow-sm';
        break;
      case 'card-pink':
        cardClass = 'p-3.5 sm:p-4 bg-neo-pink text-black border-3 border-black brutal-shadow-sm';
        break;
      case 'card-mint':
        cardClass = 'p-3.5 sm:p-4 bg-neo-mint text-black border-3 border-black brutal-shadow-sm';
        break;
      case 'transparent':
      default:
        cardClass = '';
        break;
    }

    const transformStyle = {
      transform: `translate(${block.offsetX || 0}px, ${block.offsetY || 0}px)`,
    };

    const animProps = getElementAnimationProps(
      block.animation || slide.elementAnimation || 'pop-in',
      index,
      slide.animationDelay ?? 0.08,
      slide.animationDuration ?? 0.45
    );

    let innerContent: React.ReactNode = null;

    switch (block.type) {
      case 'heading': {
        const level = block.level || 1;
        if (level === 1) {
          innerContent = (
            <h1 className={`font-heavy uppercase tracking-tight leading-tight ${
              block.cardStyle ? '' : isLight ? 'text-black' : 'text-white'
            } ${isFullscreen ? 'text-3xl sm:text-5xl md:text-6xl' : 'text-xl sm:text-2xl md:text-3xl'}`}>
              {block.text || 'Heading 1'}
            </h1>
          );
        } else if (level === 2) {
          innerContent = (
            <h2 className={`font-heavy uppercase tracking-tight leading-snug ${
              block.cardStyle ? '' : isLight ? 'text-slate-800' : 'text-slate-100'
            } ${isFullscreen ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-lg sm:text-xl md:text-2xl'}`}>
              {block.text || 'Heading 2'}
            </h2>
          );
        } else {
          innerContent = (
            <h3 className={`font-heavy uppercase tracking-tight ${
              block.cardStyle ? '' : isLight ? 'text-slate-700' : 'text-slate-300'
            } ${isFullscreen ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
              {block.text || 'Heading 3'}
            </h3>
          );
        }
        break;
      }

      case 'text': {
        if (block.bullets && block.bullets.length > 0) {
          innerContent = (
            <div className="space-y-2 w-full">
              {block.bullets.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="w-4 h-4 rounded-full bg-neo-mint border-2 border-black shrink-0 flex items-center justify-center font-mono font-black text-[10px] text-black mt-0.5">
                    ✓
                  </div>
                  <span className={`text-xs sm:text-sm font-bold leading-relaxed ${
                    block.cardStyle ? '' : isLight ? 'text-slate-800' : 'text-slate-200'
                  }`}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          );
        } else {
          innerContent = (
            <p className={`text-xs sm:text-sm font-sans font-bold leading-relaxed whitespace-pre-wrap ${
              block.cardStyle ? '' : isLight ? 'text-slate-800' : 'text-slate-200'
            }`}>
              {block.text || 'Enter your custom paragraph text here...'}
            </p>
          );
        }
        break;
      }

      case 'badge': {
        const badgeColor = block.badgeColor || 'bg-neo-yellow';
        innerContent = (
          <div className={`px-3 py-1 ${badgeColor} text-black border-2 border-black font-mono font-black text-xs uppercase brutal-shadow-xs tracking-wider inline-flex items-center space-x-1`}>
            <span>⚡ {block.badgeText || 'HIGHLIGHT'} ⚡</span>
          </div>
        );
        break;
      }

      case 'button': {
        innerContent = (
          <a
            href={block.buttonUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neo-yellow hover:bg-neo-mint text-black border-3 border-black font-mono font-heavy text-xs sm:text-sm uppercase brutal-shadow-xs transition-colors cursor-pointer"
          >
            <span>{block.buttonLabel || 'Action Link'}</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        );
        break;
      }

      case 'image': {
        innerContent = renderSlideImage(block.imageUrl, block.imageCaption, 'w-full');
        break;
      }

      case 'code': {
        innerContent = (
          <div className="w-full bg-[#111318] text-[#e0e0e0] border-3 border-black brutal-shadow-md overflow-hidden flex flex-col font-mono text-xs sm:text-sm">
            <div className="bg-[#21262d] px-3 py-1.5 border-b-2 border-black flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neo-pink border border-black" />
                <div className="w-2.5 h-2.5 rounded-full bg-neo-yellow border border-black" />
                <div className="w-2.5 h-2.5 rounded-full bg-neo-mint border border-black" />
                <span className="text-[10px] text-slate-400 ml-2 font-bold uppercase">
                  snippet.{block.codeLanguage || 'ts'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(block.codeSnippet)}
                className="px-2 py-0.5 bg-black hover:bg-slate-800 text-white text-[10px] font-bold border border-slate-600 flex items-center space-x-1 cursor-pointer transition-all"
              >
                {copiedCode ? <Check className="w-3 h-3 text-neo-mint" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            <div className="p-3 overflow-x-auto max-h-[35vh] leading-relaxed select-text">
              <pre className="font-mono text-xs text-green-300">
                {block.codeSnippet || '// Enter code here'}
              </pre>
            </div>
            {block.codeExplanation && (
              <div className="p-2 bg-neo-yellow/20 border-t-2 border-black text-neo-yellow font-mono text-[11px] font-bold">
                {block.codeExplanation}
              </div>
            )}
          </div>
        );
        break;
      }

      case 'stat': {
        innerContent = (
          <div className="w-full p-4 bg-[#151822] text-white border-3 border-black brutal-shadow-sm text-center">
            <div className={`font-heavy text-neo-yellow tracking-tighter leading-none ${
              isFullscreen ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'
            }`}>
              {block.statValue || '99.9%'}
            </div>
            <div className="mt-2 text-xs sm:text-sm font-black uppercase text-slate-200 tracking-wide">
              {block.statLabel || 'Performance SLA'}
            </div>
            {block.statTrend && (
              <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 bg-neo-mint text-black border border-black font-mono font-black text-[10px] uppercase">
                <TrendingUp className="w-3 h-3" />
                <span>{block.statTrend}</span>
              </div>
            )}
          </div>
        );
        break;
      }

      case 'quote': {
        innerContent = (
          <div className="w-full p-4 bg-[#151822] text-white border-3 border-black brutal-shadow-sm relative">
            <Quote className="w-8 h-8 text-neo-yellow/40 absolute top-2 left-2" />
            <blockquote className="font-bold italic text-sm sm:text-base leading-snug pl-6 relative z-10">
              "{block.quoteText || 'Quote text...'}"
            </blockquote>
            <div className="mt-3 pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
              <span className="font-heavy uppercase text-neo-cyan">{block.quoteAuthor || 'Author'}</span>
              <span className="font-mono text-slate-400">{block.quoteRole}</span>
            </div>
          </div>
        );
        break;
      }

      case 'quiz': {
        innerContent = renderQuizElement(
          block.quizQuestion,
          block.quizOptions,
          block.quizCorrectIndex,
          block.quizTimeLimitSeconds,
          block.quizExplanation
        );
        break;
      }

      case 'poll': {
        innerContent = renderPollElement(block.pollQuestion, block.pollOptions);
        break;
      }

      default:
        innerContent = <div className="text-xs font-mono text-slate-400">Block element</div>;
        break;
    }

    return (
      <motion.div
        key={block.id}
        style={transformStyle}
        {...animProps}
        className={`w-full flex flex-col ${alignClass} ${cardClass} my-1.5 transition-transform`}
      >
        {innerContent}
      </motion.div>
    );
  };

  // Render Custom Multi-Column Slide
  const renderCustomSlide = () => {
    const blocks = slide.blocks || [];
    const layout = slide.layout || 'single';

    if (blocks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-600/50 m-4 w-full max-w-lg">
          <Sparkles className="w-8 h-8 text-neo-yellow mb-2 animate-bounce" />
          <h3 className="font-heavy uppercase text-sm sm:text-base tracking-tight mb-1">
            Custom Blank Slide Canvas
          </h3>
          <p className="font-mono text-xs text-slate-400 max-w-sm">
            Open the Slide Editor to add heading, text, code, stats, images, interactive quizzes, or polls.
          </p>
        </div>
      );
    }

    // Split blocks into columns
    const col0 = blocks.filter((b) => (b.column ?? 0) === 0);
    const col1 = blocks.filter((b) => (b.column ?? 0) === 1);
    const col2 = blocks.filter((b) => (b.column ?? 0) === 2);

    let layoutGridClass = isFullscreen
      ? 'w-full max-w-5xl mx-auto px-4 sm:px-8 py-4'
      : 'w-full max-w-4xl mx-auto px-2 sm:px-4 py-1.5';
    if (layout === 'split-2') {
      layoutGridClass += ' grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 items-start';
    } else if (layout === 'grid-3') {
      layoutGridClass += ' grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 items-start';
    } else if (layout === 'asymmetric-left') {
      layoutGridClass += ' grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-3 sm:gap-6 items-start';
    } else if (layout === 'asymmetric-right') {
      layoutGridClass += ' grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-3 sm:gap-6 items-start';
    } else {
      layoutGridClass += ' flex flex-col items-center justify-center';
    }

    if (layout === 'single') {
      return (
        <div className={layoutGridClass}>
          {blocks.map((b, idx) => renderCustomBlock(b, idx))}
        </div>
      );
    }

    return (
      <div className={layoutGridClass}>
        <div className="flex flex-col w-full space-y-2">
          {col0.map((b, idx) => renderCustomBlock(b, idx))}
        </div>
        <div className="flex flex-col w-full space-y-2">
          {col1.map((b, idx) => renderCustomBlock(b, idx + col0.length))}
        </div>
        {layout === 'grid-3' && (
          <div className="flex flex-col w-full space-y-2">
            {col2.map((b, idx) => renderCustomBlock(b, idx + col0.length + col1.length))}
          </div>
        )}
      </div>
    );
  };

  const renderSlideContent = () => {
    switch (slide.type) {
      case 'custom':
        return renderCustomSlide();

      case 'title':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full px-4 sm:px-12 py-6 max-w-4xl mx-auto w-full">
            {slide.badge && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-3 sm:mb-5 px-3.5 py-1 bg-neo-yellow text-black border-2 border-black font-mono font-black text-xs sm:text-sm uppercase brutal-shadow-xs tracking-wider"
              >
                ⚡ {slide.badge} ⚡
              </motion.div>
            )}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={`font-heavy uppercase tracking-tight leading-none ${
                isLight ? 'text-black' : 'text-white'
              } ${isFullscreen ? 'text-3xl sm:text-5xl md:text-6xl max-w-5xl' : 'text-2xl sm:text-4xl max-w-2xl'}`}
            >
              {slide.title}
            </motion.h1>
            {slide.subtitle && (
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`font-bold mt-3 sm:mt-5 leading-snug ${
                  isLight ? 'text-slate-800' : 'text-slate-300'
                } ${isFullscreen ? 'text-base sm:text-2xl max-w-3xl' : 'text-sm sm:text-lg max-w-xl'}`}
              >
                {slide.subtitle}
              </motion.p>
            )}
            {slide.imageUrl && renderSlideImage(slide.imageUrl, slide.imageCaption, 'mt-4 max-w-md')}
            {renderSlideLink()}
          </div>
        );

      case 'code':
        return (
          <div className="flex flex-col h-full justify-center px-4 sm:px-10 py-5 max-w-5xl mx-auto w-full">
            <div className="mb-2.5 sm:mb-3">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-neo-cyan text-black border-2 border-black font-mono font-black text-[11px] sm:text-xs uppercase">
                  {slide.codeLanguage || 'CODE'}
                </span>
                <h2 className={`font-heavy uppercase tracking-tight truncate ${
                  isLight ? 'text-black' : 'text-white'
                } ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'}`}>
                  {slide.title}
                </h2>
              </div>
              {slide.subtitle && (
                <p className={`text-xs sm:text-sm font-bold mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  {slide.subtitle}
                </p>
              )}
            </div>

            <div className="bg-[#111318] text-[#e0e0e0] border-4 border-black brutal-shadow-lg rounded-none overflow-hidden flex flex-col font-mono text-xs sm:text-sm">
              <div className="bg-[#21262d] px-3 py-1.5 border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-neo-pink border border-black" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neo-yellow border border-black" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neo-mint border border-black" />
                  <span className="text-[10px] text-slate-400 ml-2 font-bold uppercase">
                    terminal://{slide.codeLanguage || 'snippet'}.ts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode()}
                  className="px-2 py-0.5 bg-black hover:bg-slate-800 text-white text-[10px] font-bold border border-slate-600 flex items-center space-x-1 cursor-pointer transition-all"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-neo-mint" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-x-auto max-h-[46vh] leading-relaxed select-text">
                <pre className="font-mono text-xs sm:text-sm text-green-300">
                  {slide.codeSnippet || '// No code provided'}
                </pre>
              </div>
            </div>

            {slide.codeExplanation && (
              <div className="mt-2.5 p-2 bg-neo-yellow/20 border-2 border-black font-mono text-[11px] sm:text-xs font-bold flex items-start space-x-2 text-neo-yellow">
                <Code2 className="w-4 h-4 text-neo-yellow shrink-0 mt-0.5" />
                <span>{slide.codeExplanation}</span>
              </div>
            )}
            {renderSlideLink()}
          </div>
        );

      case 'stat':
        return (
          <div className="flex flex-col items-center justify-center text-center h-full px-4 sm:px-12 py-6 max-w-4xl mx-auto w-full">
            <h2 className={`font-heavy uppercase tracking-tight mb-1 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            } ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'}`}>
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className={`text-xs sm:text-sm font-bold mb-4 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                {slide.subtitle}
              </p>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-6 sm:p-8 border-4 border-black brutal-shadow-lg max-w-2xl w-full my-2 ${
                isLight ? 'bg-neo-cream text-black' : 'bg-[#151822] text-white'
              }`}
            >
              <div className={`font-heavy tracking-tighter leading-none ${
                isLight ? 'text-black' : 'text-neo-yellow'
              } ${isFullscreen ? 'text-6xl sm:text-8xl' : 'text-5xl sm:text-7xl'}`}>
                {slide.statValue || '100%'}
              </div>
              <div className={`mt-3 text-sm sm:text-lg font-black uppercase tracking-wide ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                {slide.statLabel || 'Metric Performance'}
              </div>
              {slide.statTrend && (
                <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-neo-mint text-black border-2 border-black font-mono font-black text-xs uppercase brutal-shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{slide.statTrend}</span>
                </div>
              )}
            </motion.div>

            {slide.imageUrl && renderSlideImage(slide.imageUrl, slide.imageCaption, 'mt-3 max-w-sm')}
            {renderSlideLink()}
          </div>
        );

      case 'quote':
        return (
          <div className="flex flex-col items-center justify-center h-full px-4 sm:px-12 py-6 max-w-4xl mx-auto w-full">
            <div className={`p-6 sm:p-10 border-4 border-black brutal-shadow-lg relative w-full ${
              isLight ? 'bg-white text-black' : 'bg-[#151822] text-white'
            }`}>
              <Quote className="w-12 h-12 sm:w-16 sm:h-16 text-neo-yellow/70 absolute -top-6 -left-4 -z-0 fill-neo-yellow/30" />
              <blockquote className={`font-bold italic leading-snug relative z-10 ${
                isFullscreen ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
              }`}>
                "{slide.quoteText || 'Write a memorable pull quote or key takeaway here.'}"
              </blockquote>
              <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between">
                <div>
                  <div className={`font-heavy text-base sm:text-lg uppercase ${
                    isLight ? 'text-black' : 'text-neo-cyan'
                  }`}>
                    {slide.quoteAuthor || 'Author Name'}
                  </div>
                  {slide.quoteRole && (
                    <div className={`text-xs sm:text-sm font-mono font-bold ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {slide.quoteRole}
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-neo-pink border-2 border-black flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
              </div>
            </div>
            {renderSlideLink()}
          </div>
        );

      case 'interactive_quiz':
        return (
          <div className="flex flex-col items-center justify-center h-full px-3 sm:px-8 py-4 max-w-4xl mx-auto w-full text-center">
            {renderQuizElement(
              slide.quizQuestion,
              slide.quizOptions,
              slide.quizCorrectIndex,
              slide.quizTimeLimitSeconds,
              slide.quizExplanation,
              slide.subtitle
            )}
          </div>
        );

      case 'interactive_poll':
        return (
          <div className="flex flex-col items-center justify-center h-full px-3 sm:px-8 py-4 max-w-4xl mx-auto w-full text-center">
            {renderPollElement(slide.pollQuestion, slide.pollOptions, slide.subtitle)}
          </div>
        );

      case 'content':
      default: {
        const hasImage = Boolean(slide.imageUrl);
        const position = slide.imagePosition || 'right';

        return (
          <div className="flex flex-col h-full justify-center px-4 sm:px-12 py-5 max-w-5xl mx-auto w-full">
            <div className="mb-3 sm:mb-5">
              {slide.badge && (
                <span className="px-2.5 py-0.5 bg-neo-yellow text-black border-2 border-black font-mono font-black text-[11px] uppercase brutal-shadow-xs inline-block mb-1.5">
                  {slide.badge}
                </span>
              )}
              <h2 className={`font-heavy uppercase tracking-tight ${
                isLight ? 'text-black' : 'text-white'
              } ${isFullscreen ? 'text-2xl sm:text-4xl md:text-5xl' : 'text-xl sm:text-3xl'}`}>
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className={`text-xs sm:text-base font-bold mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {slide.subtitle}
                </p>
              )}
            </div>

            <div className={`w-full ${hasImage && (position === 'right' || position === 'left') ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-center' : 'space-y-3'}`}>
              {hasImage && position === 'left' && renderSlideImage(slide.imageUrl, slide.imageCaption, 'w-full')}

              <div className="space-y-2.5">
                {slide.bullets && slide.bullets.length > 0 ? (
                  slide.bullets.map((bullet, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ x: -15, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.06 * idx }}
                      className={`p-2.5 sm:p-3.5 border-3 border-black brutal-shadow-sm flex items-start space-x-2.5 text-left ${
                        isLight ? 'bg-white text-black' : 'bg-[#151822] text-white'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-neo-mint border-2 border-black shrink-0 flex items-center justify-center font-mono font-black text-xs text-black mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className={`font-bold leading-snug ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                        {bullet}
                      </span>
                    </motion.div>
                  ))
                ) : slide.markdown ? (
                  <div className={`p-3.5 sm:p-5 border-3 border-black brutal-shadow-sm font-sans text-xs sm:text-sm leading-relaxed ${
                    isLight ? 'bg-white text-black' : 'bg-[#151822] text-white'
                  }`}>
                    {slide.markdown}
                  </div>
                ) : (
                  <div className="p-3 bg-black/30 border-2 border-black text-slate-400 font-mono text-xs">
                    No bullet items configured for this slide.
                  </div>
                )}
              </div>

              {hasImage && position === 'right' && renderSlideImage(slide.imageUrl, slide.imageCaption, 'w-full')}
            </div>

            {hasImage && position === 'top' && renderSlideImage(slide.imageUrl, slide.imageCaption, 'w-full mt-3')}
            {renderSlideLink()}
          </div>
        );
      }
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col justify-between select-none overflow-hidden ${themeConfig.bg}`}>
      <motion.div
        key={`${slide.id}-${animationTriggerKey ?? ''}`}
        {...getSlideTransitionVariants(slide.transition || 'arcade-pop', slide.animationDuration ?? 0.45)}
        className="flex-1 overflow-y-auto w-full flex flex-col p-1.5 sm:p-3"
      >
        <div className="w-full flex flex-col items-center justify-center my-auto min-h-full py-1">
          {renderSlideContent()}
        </div>
      </motion.div>

      {typeof slideNumber === 'number' && typeof totalSlides === 'number' && (
        <div className={`px-4 sm:px-6 py-2 border-t-2 border-black/25 flex items-center justify-between text-[11px] sm:text-xs font-mono font-bold shrink-0 ${
          isLight ? 'text-slate-700 bg-black/5' : 'text-slate-400 bg-black/40'
        }`}>
          <span className="uppercase tracking-wider">SKETCHCAST ARENA DECK</span>
          <span className="px-2 py-0.5 bg-black text-white font-mono font-black border border-slate-700">
            {slideNumber} / {totalSlides}
          </span>
        </div>
      )}
    </div>
  );
};

