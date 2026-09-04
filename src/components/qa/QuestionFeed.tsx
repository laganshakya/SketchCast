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
    <div className="flex flex-col h-full bg-[#12141D] border-2 border-black brutal-shadow-lg overflow-hidden font-sans">
      {/* Top Feed Bar */}
      <div className="p-3 sm:p-3.5 border-b-2 border-black bg-neo-card">
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-base font-heavy tracking-tight text-white uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neo-yellow" />
              <span>LIVE Q&A FEED</span>
            </span>
            <span className="text-[10px] sm:text-xs font-mono font-black px-1.5 sm:px-2 py-0.2 sm:py-0.5 bg-neo-yellow text-black border border-black brutal-shadow-sm">
              {questions.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Host [🧠 CLUSTER THEMES] Button */}
            {isHost && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleClusterThemes}
                disabled={isClustering || questions.length < 2}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#8A2BE2] hover:bg-[#9B42F5] disabled:opacity-50 text-white text-[11px] sm:text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1 cursor-pointer"
                title="Use Mesh AI to group questions into high-level technical themes"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{isClustering ? 'CLUSTERING...' : '🧠 CLUSTER THEMES'}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onOpenAskModal();
              }}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-neo-pink hover:bg-[#FF4782] text-white text-[11px] sm:text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-3" />
              <span>ASK QUESTION</span>
            </motion.button>
          </div>
        </div>

        {/* Retro Folder Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black border-2 border-black font-mono text-xs">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              setActiveTab('top');
            }}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
              activeTab === 'top'
                ? 'bg-neo-yellow text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>TOP</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              setActiveTab('recent');
            }}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
              activeTab === 'recent'
                ? 'bg-neo-cyan text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>RECENT</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              setActiveTab('answered');
            }}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
              activeTab === 'answered'
                ? 'bg-neo-mint text-black border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>ANSWERED</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              setActiveTab('spotlight');
            }}
            className={`py-1.5 font-extrabold uppercase transition-all flex items-center justify-center space-x-1 border cursor-pointer ${
              activeTab === 'spotlight'
                ? 'bg-neo-pink text-white border-black brutal-shadow-sm'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>SPOTLIGHT</span>
          </motion.button>
        </div>

        {/* AI Topic Cluster Category Pills */}
        {clusters.length > 0 && (
          <div className="mt-2 pt-2 border-t border-black/40 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase shrink-0 flex items-center gap-1">
              <Brain className="w-3 h-3 text-[#B547FF]" />
              <span>THEMES:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedClusterTheme(null);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-black uppercase border border-black brutal-shadow-sm cursor-pointer shrink-0 transition-all ${
                selectedClusterTheme === null
                  ? 'bg-white text-black font-bold'
                  : 'bg-black text-slate-400 hover:text-white'
              }`}
            >
              ALL ({questions.length})
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
                  style={{
                    backgroundColor: isSelected ? c.color : 'transparent',
                    color: isSelected ? '#000' : '#FFF',
                    borderColor: c.color,
                  }}
                  className={`px-2 py-0.5 font-mono text-[10px] font-black uppercase border brutal-shadow-sm cursor-pointer shrink-0 flex items-center gap-1 transition-all ${
                    !isSelected ? 'hover:bg-slate-800' : ''
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.themeName}</span>
                  <span className="opacity-80 font-normal">({c.questionIds.length})</span>
                </button>
              );
            })}
          </div>
        )}

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
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-24 sm:pb-28 md:pb-4">
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500 font-mono">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
            <p className="text-xs font-bold uppercase">NO QUESTIONS IN QUEUE</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Submit an architecture question to challenge the speaker!
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
