import React, { useState } from 'react';
import { Plus, Flame, Clock, CheckCircle2, Sparkles, Search, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Question, QuestionStatus, QuestionCluster } from '../../types';
import { QuestionCard } from './QuestionCard';
import { playClickSound, playPopSound } from '../../lib/soundFx';
import { clusterQuestionsWithAI } from '../../lib/meshApi';

interface QuestionFeedProps {
  questions: Question[];
  upvotedIds: Set<string>;
  onToggleUpvote: (id: string) => void;
  onStatusChange?: (id: string, status: QuestionStatus) => void;
  onUpdateTalkingPoints?: (id: string, points: string[]) => void;
  onOpenAISettings?: () => void;
  activeTab: 'top' | 'recent' | 'answered' | 'spotlight';
  setActiveTab: (tab: 'top' | 'recent' | 'answered' | 'spotlight') => void;
  onOpenAskModal: () => void;
  isHost?: boolean;
  compact?: boolean;
  initialClusters?: QuestionCluster[];
  onClustersChange?: (clusters: QuestionCluster[]) => void;
}

export const QuestionFeed: React.FC<QuestionFeedProps> = ({
  questions,
  upvotedIds,
  onToggleUpvote,
  onStatusChange,
  onUpdateTalkingPoints,
  onOpenAISettings,
  activeTab,
  setActiveTab,
  onOpenAskModal,
  isHost = false,
  compact = false,
  initialClusters,
  onClustersChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clusters, setClusters] = useState<QuestionCluster[]>(initialClusters || []);
  const [selectedClusterTheme, setSelectedClusterTheme] = useState<string | null>(null);
  const [isClustering, setIsClustering] = useState(false);

  const handleClusterThemes = async () => {
    if (!isHost || isClustering || questions.length < 2) return;
    setIsClustering(true);
    try {
      playClickSound();
      const generatedClusters = await clusterQuestionsWithAI(questions);
      setClusters(generatedClusters);
      onClustersChange?.(generatedClusters);
      playPopSound();
    } catch (err) {
      console.error('[QuestionFeed] Clustering error:', err);
    } finally {
      setIsClustering(false);
    }
  };

  const filtered = questions.filter((q) => {
    if (selectedClusterTheme) {
      const activeCluster = clusters.find((c) => c.themeName === selectedClusterTheme);
      if (activeCluster && !activeCluster.questionIds.includes(q.id)) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    return (
      q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden font-sans shadow-card">
      {/* Top Feed Bar */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-[#0E0E11]">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center space-x-2.5">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Live Q&A Feed</span>
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {questions.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Host [CLUSTER THEMES] Button */}
            {isHost && (
              <motion.button
                whileTap={{ y: 1 }}
                onClick={handleClusterThemes}
                disabled={isClustering || questions.length < 2}
                className="px-3 py-1.5 bg-[#18181D] hover:bg-[#22222A] disabled:opacity-50 text-white text-xs font-semibold rounded-xl border border-white/[0.08] hover:border-blue-500/40 transition-colors flex items-center space-x-1.5 cursor-pointer"
                title="Use Mesh AI to group questions into high-level technical themes"
              >
                <Brain className="w-3.5 h-3.5 text-blue-400" />
                <span>{isClustering ? 'Clustering...' : 'Cluster Themes'}</span>
              </motion.button>
            )}

            <motion.button
              whileTap={{ y: 1 }}
              onClick={() => {
                playClickSound();
                onOpenAskModal();
              }}
              className="px-3.5 py-1.5 btn-cobalt text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ask Question</span>
            </motion.button>
          </div>
        </div>

        {/* Modern Segmented Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#0A0A0C] border border-white/[0.08] rounded-xl text-[10px] sm:text-xs">
          <motion.button
            whileTap={{ y: 1 }}
            onClick={() => {
              playClickSound();
              setActiveTab('top');
            }}
            className={`py-1.5 px-1 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] ${
              activeTab === 'top'
                ? 'bg-[#18181D] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Top</span>
          </motion.button>

          <motion.button
            whileTap={{ y: 1 }}
            onClick={() => {
              playClickSound();
              setActiveTab('recent');
            }}
            className={`py-1.5 px-1 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] ${
              activeTab === 'recent'
                ? 'bg-[#18181D] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Recent</span>
          </motion.button>

          <motion.button
            whileTap={{ y: 1 }}
            onClick={() => {
              playClickSound();
              setActiveTab('answered');
            }}
            className={`py-1.5 px-1 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] ${
              activeTab === 'answered'
                ? 'bg-[#18181D] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Answered</span>
          </motion.button>

          <motion.button
            whileTap={{ y: 1 }}
            onClick={() => {
              playClickSound();
              setActiveTab('spotlight');
            }}
            className={`py-1.5 px-1 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer min-h-[36px] ${
              activeTab === 'spotlight'
                ? 'bg-[#18181D] text-white shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Stage</span>
          </motion.button>
        </div>

        {/* AI Topic Cluster Category Pills */}
        {clusters.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-medium text-zinc-400 shrink-0 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-blue-400" />
              <span>Themes:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedClusterTheme(null);
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer shrink-0 transition-colors ${
                selectedClusterTheme === null
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#18181D] text-zinc-400 border-white/[0.08] hover:text-white hover:border-zinc-700'
              }`}
            >
              All ({questions.length})
            </button>
            {clusters.map((c) => {
              const isSelected = selectedClusterTheme === c.themeName;
              return (
                <button
                  key={c.themeName}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedClusterTheme(isSelected ? null : c.themeName);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-[#141418] text-zinc-400 border-white/[0.08] hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.themeName}</span>
                  <span className="text-blue-400 font-mono text-[11px]">{c.questionIds.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search questions or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#0A0A0C] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 pb-40 sm:pb-44 md:pb-6">
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-400">
            <Sparkles className="w-8 h-8 text-zinc-600 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-zinc-300">No questions in queue</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Submit an architecture question to challenge the keynote speaker.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((q) => {
              const qCluster = clusters.find((c) => c.questionIds.includes(q.id));
              const clusterTheme = qCluster
                ? { name: qCluster.themeName, emoji: qCluster.emoji, color: qCluster.color }
                : undefined;

              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isUpvoted={upvotedIds.has(q.id)}
                  onToggleUpvote={onToggleUpvote}
                  onStatusChange={onStatusChange}
                  onUpdateTalkingPoints={onUpdateTalkingPoints}
                  onOpenAISettings={onOpenAISettings}
                  isHost={isHost}
                  compact={compact}
                  clusterTheme={clusterTheme}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
