import React, { useState } from 'react';
import {
  ChevronUp,
  CheckCircle,
  Sparkles,
  XCircle,
  Mic,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Question, QuestionStatus } from '../../types';
import { generateSpeakerTalkingPoints, getStoredMeshKey } from '../../lib/meshApi';
import { playPopSound, playClickSound } from '../../lib/soundFx';

interface QuestionCardProps {
  question: Question;
  isUpvoted: boolean;
  onToggleUpvote: (id: string) => void;
  onStatusChange?: (id: string, status: QuestionStatus) => void;
  onUpdateTalkingPoints?: (id: string, points: string[]) => void;
  onOpenAISettings?: () => void;
  isHost?: boolean;
  compact?: boolean;
  clusterTheme?: { name: string; emoji: string; color: string };
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  return `${Math.floor(mins / 60)}H AGO`;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isUpvoted,
  onToggleUpvote,
  onStatusChange,
  onUpdateTalkingPoints,
  onOpenAISettings,
  isHost = false,
  compact = false,
  clusterTheme,
}) => {
  const [isGeneratingPoints, setIsGeneratingPoints] = useState(false);
  const [localPoints, setLocalPoints] = useState<string[] | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const effectivePoints = question.aiTalkingPoints || localPoints;

  const getStatusBadge = () => {
    switch (question.status) {
      case 'spotlight':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-black uppercase bg-neo-pink text-white border border-black brutal-shadow-sm animate-pulse shrink-0">
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" />
            <span>★ ON STAGE ★</span>
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-black uppercase bg-neo-mint text-black border border-black brutal-shadow-sm shrink-0">
            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
            <span>ANSWERED</span>
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-black shrink-0">
            <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
            <span>DISMISSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold uppercase bg-[#1A1E2B] text-slate-400 border border-black shrink-0">
            QUEUED
          </span>
        );
    }
  };

  const handleGenerateTalkingPoints = async () => {
    if (!isHost) return;

    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setPointsError('Mesh API Key missing. Please open AI Settings in header.');
      return;
    }

    setIsGeneratingPoints(true);
    setPointsError(null);

    try {
      const points = await generateSpeakerTalkingPoints(
        question.content,
        question.author_name
      );

      setLocalPoints(points);
      if (onUpdateTalkingPoints) {
        onUpdateTalkingPoints(question.id, points);
      }
    } catch (err: any) {
      setPointsError(err?.message || 'Failed to generate talking points.');
    } finally {
      setIsGeneratingPoints(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`border-2 border-black transition-all font-sans relative ${
        question.status === 'spotlight'
          ? 'bg-[#1D2030] border-neo-pink brutal-shadow-pink'
          : 'bg-neo-card hover:bg-[#1A1E2B] brutal-shadow-sm'
      } ${compact ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'}`}
    >
      <div className="flex items-start space-x-2.5 sm:space-x-3">
        {/* Chunky Upvote Button with spring tap & pop SFX */}
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            playPopSound();
            onToggleUpvote(question.id);
          }}
          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 min-w-10 sm:min-w-12 border-2 border-black transition-all cursor-pointer shrink-0 ${
            isUpvoted
              ? 'bg-neo-mint text-black brutal-shadow-sm font-black'
              : 'bg-[#10121A] text-slate-300 hover:text-white hover:bg-[#1E2332] brutal-shadow-sm'
          }`}
          title="Vote to rank this question"
        >
          <ChevronUp className={`w-4 h-4 sm:w-5 sm:h-5 stroke-3 transition-transform ${isUpvoted ? 'scale-110' : ''}`} />
          <span className="text-[11px] sm:text-xs font-mono font-black mt-0.5">
            {question.upvotes_count}
          </span>
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5 font-mono flex-wrap">
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-black text-neo-yellow truncate max-w-28 sm:max-w-44 uppercase">
                {question.author_name}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold shrink-0">
                {timeAgo(question.created_at)}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 flex-wrap">
              {clusterTheme && (
                <span
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase border border-black shrink-0"
                  style={{ backgroundColor: `${clusterTheme.color}25`, color: clusterTheme.color, borderColor: clusterTheme.color }}
                  title={`AI Topic Cluster: ${clusterTheme.name}`}
                >
                  <span>{clusterTheme.emoji}</span>
                  <span>{clusterTheme.name}</span>
                </span>
              )}
              {getStatusBadge()}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-100 font-semibold leading-relaxed wrap-break-word font-display">
            {question.content}
          </p>

          {/* AI Speaker Talking Points (Host Private Assistant Card) */}
          {isHost && question.status === 'spotlight' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2.5 p-2.5 sm:p-3 bg-[#11131C] border border-neo-yellow/70 brutal-shadow-sm font-mono space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-black uppercase text-neo-yellow flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-neo-yellow" />
                  <span>HOST CO-PILOT // SPEAKER TALKING POINTS</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-black text-neo-yellow border border-neo-yellow font-black">
                  HOST PRIVATE
                </span>
              </div>

              {effectivePoints && effectivePoints.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {effectivePoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-200">
                      <span className="text-neo-yellow font-black shrink-0">▸</span>
                      <span className="leading-snug">{pt}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        handleGenerateTalkingPoints();
                      }}
                      disabled={isGeneratingPoints}
                      className="px-2 py-0.5 bg-[#1C2030] hover:bg-neo-yellow hover:text-black text-slate-300 text-[10px] font-bold uppercase border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all"
                      title="Re-generate talking points"
                    >
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>{isGeneratingPoints ? 'GENERATING...' : 'REFRESH POINTS'}</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      handleGenerateTalkingPoints();
                    }}
                    disabled={isGeneratingPoints}
                    className="px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[10px] sm:text-[11px] font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{isGeneratingPoints ? 'GENERATING...' : 'AI TALKING POINTS'}</span>
                  </motion.button>
                </div>
              )}

              {pointsError && (
                <div className="p-1.5 bg-neo-pink text-white text-[10px] font-bold border border-black flex items-start space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{pointsError}</span>
                    {onOpenAISettings && pointsError.includes('AI Settings') && (
                      <button
                        type="button"
                        onClick={onOpenAISettings}
                        className="ml-1 underline font-black text-black bg-white px-1"
                      >
                        Settings
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Host Moderation Toolbar */}
          {isHost && onStatusChange && (
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap font-mono">
              <div className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap gap-y-1">
                {question.status !== 'spotlight' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'spotlight');
                    }}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase text-white bg-neo-pink hover:bg-[#FF4782] border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>SPOTLIGHT</span>
                  </motion.button>
                )}
                {question.status !== 'answered' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'answered');
                    }}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase text-black bg-neo-mint hover:bg-[#26F7A9] border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>ANSWER</span>
                  </motion.button>
                )}
                {question.status !== 'pending' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'pending');
                    }}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800 border border-black cursor-pointer"
                  >
                    RESET
                  </motion.button>
                )}
              </div>

              {question.status !== 'dismissed' && (
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    playClickSound();
                    onStatusChange(question.id, 'dismissed');
                  }}
                  className="p-1 text-slate-500 hover:text-neo-pink transition-colors cursor-pointer"
                  title="Dismiss Question"
                >
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
