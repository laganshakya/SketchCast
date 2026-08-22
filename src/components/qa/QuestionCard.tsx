import React from 'react';
import { ChevronUp, CheckCircle, Sparkles, XCircle } from 'lucide-react';
import type { Question, QuestionStatus } from '../../types';

interface QuestionCardProps {
  question: Question;
  isUpvoted: boolean;
  onToggleUpvote: (id: string) => void;
  onStatusChange?: (id: string, status: QuestionStatus) => void;
  isHost?: boolean;
  compact?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  isUpvoted,
  onToggleUpvote,
  onStatusChange,
  isHost = false,
  compact = false,
}) => {
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

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (mins < 1) return 'JUST NOW';
    if (mins < 60) return `${mins}M AGO`;
    return `${Math.floor(mins / 60)}H AGO`;
  };

  return (
    <div
      className={`border-2 border-black transition-all font-sans relative ${
        question.status === 'spotlight'
          ? 'bg-[#1D2030] border-neo-pink brutal-shadow-pink'
          : 'bg-neo-card hover:bg-[#1A1E2B] brutal-shadow-sm'
      } ${compact ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'}`}
    >
      <div className="flex items-start space-x-2.5 sm:space-x-3">
        {/* Chunky Upvote Button */}
        <button
          onClick={() => onToggleUpvote(question.id)}
          className={`flex flex-col items-center justify-center p-1.5 sm:p-2 min-w-10 sm:min-w-12 border-2 border-black transition-all active:translate-x-px active:translate-y-px active:shadow-none cursor-pointer shrink-0 ${
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
        </button>

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
            {getStatusBadge()}
          </div>

          <p className="text-xs sm:text-sm text-slate-100 font-semibold leading-relaxed wrap-break-word font-display">
            {question.content}
          </p>

          {/* Host Moderation Toolbar */}
          {isHost && onStatusChange && (
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap font-mono">
              <div className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap gap-y-1">
                {question.status !== 'spotlight' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'spotlight')}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase text-white bg-neo-pink hover:bg-[#FF4782] border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>SPOTLIGHT</span>
                  </button>
                )}
                {question.status !== 'answered' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'answered')}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase text-black bg-neo-mint hover:bg-[#26F7A9] border border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>ANSWER</span>
                  </button>
                )}
                {question.status !== 'pending' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'pending')}
                    className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800 border border-black cursor-pointer"
                  >
                    RESET
                  </button>
                )}
              </div>

              {question.status !== 'dismissed' && (
                <button
                  onClick={() => onStatusChange(question.id, 'dismissed')}
                  className="p-1 text-slate-500 hover:text-neo-pink transition-colors cursor-pointer"
                  title="Dismiss Question"
                >
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
