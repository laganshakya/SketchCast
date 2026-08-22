import React, { useState } from 'react';
import { Plus, Flame, Clock, CheckCircle2, Sparkles, Search } from 'lucide-react';
import type { Question, QuestionStatus } from '../../types';
import { QuestionCard } from './QuestionCard';

interface QuestionFeedProps {
  questions: Question[];
  upvotedIds: Set<string>;
  onToggleUpvote: (id: string) => void;
  onStatusChange?: (id: string, status: QuestionStatus) => void;
  activeTab: 'top' | 'recent' | 'answered' | 'spotlight';
  setActiveTab: (tab: 'top' | 'recent' | 'answered' | 'spotlight') => void;
  onOpenAskModal: () => void;
  isHost?: boolean;
  compact?: boolean;
}

export const QuestionFeed: React.FC<QuestionFeedProps> = ({
  questions,
  upvotedIds,
  onToggleUpvote,
  onStatusChange,
  activeTab,
  setActiveTab,
  onOpenAskModal,
  isHost = false,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    return (
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#12141D] border-2 border-black brutal-shadow-lg overflow-hidden font-sans">
      {/* Top Feed Bar */}
      <div className="p-3.5 border-b-2 border-black bg-neo-card">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-base font-heavy tracking-tight text-white uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neo-yellow" />
              <span>LIVE Q&A FEED</span>
            </span>
            <span className="text-xs font-mono font-black px-2 py-0.5 bg-neo-yellow text-black border border-black brutal-shadow-sm">
              {questions.length}
            </span>
          </div>

          <button
            onClick={onOpenAskModal}
            className="px-3 py-1.5 bg-neo-pink hover:bg-[#FF4782] active:translate-x-px active:translate-y-px active:shadow-none text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-3" />
            <span>ASK QUESTION</span>
          </button>
        </div>

        {/* Retro Folder Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black border-2 border-black font-mono text-xs">
          <button
            onClick={() => setActiveTab('top')}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border ${
              activeTab === 'top'
                ? 'bg-neo-yellow text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>TOP</span>
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border ${
              activeTab === 'recent'
                ? 'bg-neo-cyan text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('spotlight')}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border ${
              activeTab === 'spotlight'
                ? 'bg-neo-pink text-white border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>STAGE</span>
          </button>

          <button
            onClick={() => setActiveTab('answered')}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border ${
              activeTab === 'answered'
                ? 'bg-neo-mint text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>DONE</span>
          </button>
        </div>

        {/* Search */}
        <div className="mt-2.5 relative font-mono">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neo-card-darker border-2 border-black text-slate-200 placeholder-slate-500 focus:outline-none focus:border-neo-yellow font-mono"
          />
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500 font-mono">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
            <p className="text-xs font-bold uppercase">NO QUESTIONS IN QUEUE</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Submit an architecture question to challenge the speaker!
            </p>
          </div>
        ) : (
          filtered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isUpvoted={upvotedIds.has(q.id)}
              onToggleUpvote={onToggleUpvote}
              onStatusChange={onStatusChange}
              isHost={isHost}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  );
};
