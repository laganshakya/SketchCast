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
import { RollingCounter } from '../common/RollingCounter';

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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-ink text-paper dark:bg-lime/20 dark:text-lime border border-hairline shrink-0">
            <Sparkles className="w-3 h-3 fill-lime" />
            <span>On Stage</span>
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-lime/30 text-ink border border-ink/20 shrink-0">
            <CheckCircle className="w-3 h-3 stroke-[2.5]" />
            <span>Answered</span>
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-paper text-muted border border-hairline shrink-0">
            <XCircle className="w-3 h-3 text-muted" />
            <span>Dismissed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-paper text-muted border border-hairline shrink-0">
            Queued
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`border rounded-2xl transition-all font-sans relative ${
        question.status === 'spotlight'
          ? 'bg-lime/20 border-2 border-lime shadow-sm'
          : 'bg-paper-surface hover:bg-paper border-hairline'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start space-x-3">
        {/* Kinetic Upvote Button */}
        <motion.button
          whileTap={{ y: 1 }}
          onClick={() => {
            playPopSound();
            onToggleUpvote(question.id);
          }}
          className={`flex flex-col items-center justify-center p-2 min-w-11 sm:min-w-12 rounded-xl border transition-all cursor-pointer shrink-0 ${
            isUpvoted
              ? 'bg-ink text-paper dark:bg-lime dark:text-ink border-hairline shadow-sm'
              : 'bg-paper text-muted hover:text-ink hover:bg-paper-surface border-hairline hover:border-ink/40'
          }`}
          title="Vote to rank this question"
        >
          <ChevronUp className={`w-4 h-4 stroke-[2.5] transition-transform ${isUpvoted ? 'scale-110' : ''}`} />
          <RollingCounter
            value={question.upvotes_count}
            className={`text-xs font-mono font-bold mt-0.5 ${isUpvoted ? 'text-paper dark:text-ink' : 'text-ink'}`}
          />
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <span className="text-xs font-bold text-ink truncate max-w-[100px] min-[360px]:max-w-[130px] sm:max-w-48">
                {question.author_name}
              </span>
              <span className="text-[10px] sm:text-[11px] text-muted font-mono shrink-0">
                • {timeAgo(question.created_at)}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 flex-wrap">
              {clusterTheme && (
                <span
                  className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-medium rounded-full border shrink-0 bg-paper text-ink border-hairline font-mono"
                  title={`AI Topic Cluster: ${clusterTheme.name}`}
                >
                  <span>{clusterTheme.emoji}</span>
                  <span>{clusterTheme.name}</span>
                </span>
              )}
              {getStatusBadge()}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-ink/90 font-medium leading-relaxed break-words font-sans">
            {question.content}
          </p>

          {/* AI Speaker Talking Points (Host Private Assistant Card) */}
          {isHost && question.status === 'spotlight' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3.5 bg-paper border border-hairline rounded-2xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-orange" />
                  <span>Speaker Talking Points</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-paper-surface text-muted border border-hairline rounded-full font-mono">
                  Private
                </span>
              </div>

              {effectivePoints && effectivePoints.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {effectivePoints.map((pt) => (
                    <div key={pt} className="flex items-start space-x-2 text-xs text-ink/90">
                      <span className="text-orange font-bold shrink-0">›</span>
                      <span className="leading-snug">{pt}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <motion.button
                      type="button"
                      whileTap={{ y: 1 }}
                      onClick={() => {
                        playClickSound();
                        handleGenerateTalkingPoints();
                      }}
                      disabled={isGeneratingPoints}
                      className="px-2.5 py-1 bg-paper hover:bg-paper-surface text-ink text-[11px] font-semibold rounded-lg border border-hairline hover:border-ink flex items-center space-x-1.5 cursor-pointer transition-colors"
                      title="Re-generate talking points"
                    >
                      <Sparkles className="w-3 h-3 text-orange shrink-0" />
                      <span>{isGeneratingPoints ? 'Generating...' : 'Refresh Points'}</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      playClickSound();
                      handleGenerateTalkingPoints();
                    }}
                    disabled={isGeneratingPoints}
                    className="px-3 py-1.5 btn-noma-orange text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{isGeneratingPoints ? 'Generating...' : 'Generate Talking Points'}</span>
                  </motion.button>
                </div>
              )}

              {pointsError && (
                <div className="p-2.5 bg-orange/15 text-orange text-xs border border-orange/30 rounded-xl flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange" />
                  <div className="flex-1">
                    <span>{pointsError}</span>
                    {onOpenAISettings && pointsError.includes('AI Settings') && (
                      <button
                        type="button"
                        onClick={onOpenAISettings}
                        className="ml-1.5 underline font-semibold text-ink cursor-pointer"
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
            <div className="mt-3 pt-2.5 border-t border-hairline flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {question.status !== 'spotlight' && (
                  <motion.button
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'spotlight');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold btn-noma-orange rounded-xl flex items-center space-x-1 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Spotlight</span>
                  </motion.button>
                )}
                {question.status !== 'answered' && (
                  <motion.button
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'answered');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-ink bg-lime hover:bg-lime/90 border border-ink/20 rounded-xl flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Resolve</span>
                  </motion.button>
                )}
                {question.status !== 'pending' && (
                  <motion.button
                    whileTap={{ y: 1 }}
                    onClick={() => {
                      playClickSound();
                      onStatusChange(question.id, 'pending');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink bg-paper border border-hairline hover:border-ink rounded-xl cursor-pointer transition-colors"
                  >
                    Reset
                  </motion.button>
                )}
              </div>

              {question.status !== 'dismissed' && (
                <motion.button
                  whileTap={{ y: 1 }}
                  onClick={() => {
                    playClickSound();
                    onStatusChange(question.id, 'dismissed');
                  }}
                  className="p-1 text-muted hover:text-orange transition-colors cursor-pointer"
                  title="Dismiss Question"
                >
                  <XCircle className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
