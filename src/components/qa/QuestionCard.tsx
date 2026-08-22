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
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 font-mono text-[10px] font-black uppercase bg-neo-pink text-white border border-black brutal-shadow-sm animate-pulse">
            <Sparkles className="w-3 h-3 fill-white" />
            <span>★ ON STAGE ★</span>
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 font-mono text-[10px] font-black uppercase bg-neo-mint text-black border border-black brutal-shadow-sm">
            <CheckCircle className="w-3 h-3 stroke-[2.5]" />
            <span>ANSWERED</span>
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-black">
            <XCircle className="w-3 h-3 text-slate-500" />
            <span>DISMISSED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase bg-[#1A1E2B] text-slate-400 border border-black">
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
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex items-start space-x-3">
        {/* Chunky Upvote Button */}
        <button
          onClick={() => onToggleUpvote(question.id)}
          className={`flex flex-col items-center justify-center p-2 min-w-12 border-2 border-black transition-all active:translate-x-px active:translate-y-px active:shadow-none ${
            isUpvoted
              ? 'bg-neo-mint text-black brutal-shadow-sm font-black'
              : 'bg-[#10121A] text-slate-300 hover:text-white hover:bg-[#1E2332] brutal-shadow-sm'
          }`}
          title="Vote to rank this question"
        >
          <ChevronUp className={`w-5 h-5 stroke-3 transition-transform ${isUpvoted ? 'scale-110' : ''}`} />
          <span className="text-xs font-mono font-black mt-0.5">
            {question.upvotes_count}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-neo-yellow truncate max-w-36 uppercase">
                {question.author_name}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">
                {timeAgo(question.created_at)}
              </span>
            </div>
            {getStatusBadge()}
          </div>

          <p className="text-sm text-slate-100 font-semibold leading-relaxed wrap-break-word font-display">
            {question.content}
          </p>

          {/* Host Moderation Toolbar */}
          {isHost && onStatusChange && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between font-mono">
              <div className="flex items-center space-x-1.5">
                {question.status !== 'spotlight' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'spotlight')}
                    className="px-2 py-0.5 text-[11px] font-black uppercase text-white bg-neo-pink hover:bg-[#FF4782] border border-black brutal-shadow-sm flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>SPOTLIGHT</span>
                  </button>
                )}
                {question.status !== 'answered' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'answered')}
                    className="px-2 py-0.5 text-[11px] font-black uppercase text-black bg-neo-mint hover:bg-[#26F7A9] border border-black brutal-shadow-sm flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>ANSWER</span>
                  </button>
                )}
                {question.status !== 'pending' && (
                  <button
                    onClick={() => onStatusChange(question.id, 'pending')}
                    className="px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800 border border-black"
                  >
                    RESET
                  </button>
                )}
              </div>

              {question.status !== 'dismissed' && (
                <button
                  onClick={() => onStatusChange(question.id, 'dismissed')}
                  className="p-1 text-slate-500 hover:text-neo-pink transition-colors"
                  title="Dismiss Question"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
