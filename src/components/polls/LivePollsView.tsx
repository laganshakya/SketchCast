import React, { useState } from 'react';
import { Plus, CheckCircle2, Users, Clock, Sparkles, Vote, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { LivePoll } from '../../types';
import { synthesizePollConsensus, getStoredMeshKey } from '../../lib/meshApi';
import { playPopSound, playClickSound } from '../../lib/soundFx';

interface LivePollsViewProps {
  polls: LivePoll[];
  userVotes: Record<string, string>;
  onVote: (pollId: string, optionId: string) => void;
  onOpenCreatePoll: () => void;
  onResetPoll?: (pollId: string) => void;
  onDeletePoll?: (pollId: string) => void;
  onUpdateAIConsensus?: (pollId: string, consensusNote: string) => void;
  onOpenAISettings?: () => void;
  isHost?: boolean;
}

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  return `${Math.floor(mins / 60)}H AGO`;
}

export const LivePollsView: React.FC<LivePollsViewProps> = ({
  polls,
  userVotes,
  onVote,
  onOpenCreatePoll,
  onResetPoll,
  onDeletePoll,
  onUpdateAIConsensus,
  onOpenAISettings,
  isHost = false,
}) => {
  const [synthesizingPollId, setSynthesizingPollId] = useState<string | null>(null);
  const [localConsensusNotes, setLocalConsensusNotes] = useState<Record<string, string>>({});
  const [aiError, setAiError] = useState<{ pollId: string; message: string } | null>(null);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const getOptionFillColor = (idx: number, isVoted: boolean) => {
    if (isVoted) return 'bg-neo-yellow';
    switch (idx % 4) {
      case 0:
        return 'bg-neo-cyan';
      case 1:
        return 'bg-neo-mint';
      case 2:
        return 'bg-neo-purple';
      case 3:
        return 'bg-neo-orange';
      default:
        return 'bg-neo-yellow';
    }
  };

  const handleSynthesizeConsensus = async (poll: LivePoll) => {
    if (!isHost) return;

    const hasKey = Boolean(getStoredMeshKey());
    if (!hasKey) {
      setAiError({
        pollId: poll.id,
        message: 'Mesh API Key missing. Please open AI Settings in the header.',
      });
      return;
    }

    setSynthesizingPollId(poll.id);
    setAiError(null);

    const optionsWithVotes = poll.options.map((opt) => {
      const percentage = poll.totalVotes > 0 ? Math.round((opt.votesCount / poll.totalVotes) * 100) : 0;
      return {
        text: opt.text,
        votes: opt.votesCount,
        percentage,
      };
    });

    try {
      const consensus = await synthesizePollConsensus(
        poll.question,
        optionsWithVotes,
        poll.totalVotes
      );

      // Save locally immediately so it never disappears on re-render
      setLocalConsensusNotes((prev) => ({
        ...prev,
        [poll.id]: consensus,
      }));

      if (onUpdateAIConsensus) {
        onUpdateAIConsensus(poll.id, consensus);
      }
    } catch (err: any) {
      setAiError({
        pollId: poll.id,
        message: err?.message || 'Failed to synthesize poll consensus.',
      });
    } finally {
      setSynthesizingPollId(null);
    }
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-5 pb-24 sm:pb-28 md:pb-6 space-y-4 font-sans">
      {/* Header */}
      <div className="bg-neo-card p-3.5 sm:p-4 border-2 border-black brutal-shadow flex items-center justify-between flex-wrap gap-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-neo-cyan text-black font-mono font-black text-[10px] uppercase border border-black brutal-shadow-sm">
              LIVE_VOTING // V2.0
            </span>
            <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-400">REAL-TIME CONSENSUS</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-heavy text-white uppercase tracking-tight mt-1">
            COMMUNITY ARCHITECTURE POLLS
          </h2>
        </div>

        {/* Host only can create new polls */}
        {isHost ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              onOpenCreatePoll();
            }}
            className="w-full sm:w-auto px-4 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span>NEW POLL</span>
          </motion.button>
        ) : (
          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#1A1E2B] border-2 border-black brutal-shadow-sm text-[11px] sm:text-xs font-mono font-bold text-neo-mint flex items-center space-x-1.5 shrink-0">
            <Vote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">VOTING ACTIVE</span>
          </div>
        )}
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="bg-neo-card p-8 border-2 border-black brutal-shadow text-center space-y-3">
            <Sparkles className="w-8 h-8 text-neo-yellow mx-auto" />
            <h3 className="text-lg font-heavy uppercase text-white">
              NO ACTIVE COMMUNITY POLLS
            </h3>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
              {isHost
                ? 'Launch a poll from the button above or use AI to generate provocative tech debate topics!'
                : 'Stand by. The Host will broadcast community architecture polls during the live session.'}
            </p>
            {isHost && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  onOpenCreatePoll();
                }}
                className="mt-2 px-4 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-3" />
                <span>CREATE FIRST POLL</span>
              </motion.button>
            )}
          </div>
        ) : (
          polls.map((poll) => {
            const userVotedOptionId = userVotes[poll.id];
            const isSynthesizing = synthesizingPollId === poll.id;
            const currentError = aiError?.pollId === poll.id ? aiError.message : null;

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-[#161924] p-4 sm:p-5 border-2 border-black brutal-shadow-lg space-y-3.5 relative overflow-hidden"
              >
                {/* Poll Header Bar */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 mb-1">
                      <span className="font-bold text-neo-yellow uppercase">BY {poll.author_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {timeAgo(poll.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-heavy text-white uppercase leading-tight">
                      {poll.question}
                    </h3>
                  </div>

                  <span className="flex items-center space-x-1 px-2.5 py-1 bg-black text-neo-yellow border-2 border-black brutal-shadow-sm text-xs font-mono font-black shrink-0">
                    <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{poll.totalVotes} VOTES</span>
                  </span>
                </div>

                {/* Poll Options Grid */}
                <div className="space-y-2 font-mono">
                  {poll.options.map((option, idx) => {
                    const isVoted = userVotedOptionId === option.id;
                    const isVotingThisPoll = votingPollId === poll.id;
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votesCount / poll.totalVotes) * 100)
                        : 0;

                    return (
                      <motion.button
                        key={option.id}
                        whileHover={isVoted || isVotingThisPoll ? {} : { scale: 1.01, x: 2 }}
                        whileTap={isVoted || isVotingThisPoll ? {} : { scale: 0.98 }}
                        onClick={() => {
                          if (!isVoted && !isVotingThisPoll) {
                            playPopSound();
                            setVotingPollId(poll.id);
                            setTimeout(() => {
                              setVotingPollId((current) => (current === poll.id ? null : current));
                            }, 300);
                            onVote(poll.id, option.id);
                          }
                        }}
                        disabled={isVoted || isVotingThisPoll}
                        className={`w-full p-3 border-2 border-black text-left transition-all relative overflow-hidden flex items-center justify-between group ${
                          isVoted
                            ? 'bg-[#1C2030] border-neo-yellow brutal-shadow-yellow text-white cursor-default'
                            : isVotingThisPoll
                            ? 'bg-[#12141D] text-slate-400 brutal-shadow-sm opacity-70 cursor-not-allowed pointer-events-none'
                            : 'bg-[#12141D] hover:bg-[#191D2B] text-slate-200 hover:text-white brutal-shadow-sm cursor-pointer'
                        }`}
                      >
                        {/* Animated Percentage Fill Bar */}
                        <motion.div
                          className={`absolute inset-y-0 left-0 opacity-20 ${getOptionFillColor(
                            idx,
                            isVoted
                          )}`}
                          style={{ width: `${percentage}%` }}
                          transition={{ duration: 0.4 }}
                        />

                        {/* Content */}
                        <div className="flex items-center space-x-2.5 relative z-10 min-w-0 pr-3">
                          <div
                            className={`w-6 h-6 border-2 border-black flex items-center justify-center font-heavy text-xs shrink-0 ${
                              isVoted ? 'bg-neo-yellow text-black' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isVoted ? (
                              <CheckCircle2 className="w-4 h-4 text-black stroke-3" />
                            ) : (
                              option.id.replace('opt-', '')
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-bold font-sans tracking-tight">
                            {option.text}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center space-x-1.5 relative z-10 shrink-0 font-mono text-xs font-black">
                          <span className="text-neo-yellow text-sm">{percentage}%</span>
                          <span className="text-slate-500 hidden sm:inline">
                            ({option.votesCount})
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Rendered AI Consensus Note (Visible to all players!) */}
                {(poll.aiConsensusNote || localConsensusNotes[poll.id]) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-[#11131B] border-2 border-neo-cyan brutal-shadow-cyan font-mono text-xs text-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-neo-cyan">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neo-cyan" />
                        <span>AUDIENCE CONSENSUS SUMMARY</span>
                      </span>
                      <span className="px-1.5 py-0.5 bg-neo-cyan text-black font-black text-[9px]">MESH AI</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs leading-relaxed">
                      {poll.aiConsensusNote || localConsensusNotes[poll.id]}
                    </p>
                  </motion.div>
                )}

                {currentError && (
                  <div className="p-2 bg-neo-pink text-white font-mono text-xs font-bold border border-black flex items-start space-x-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{currentError}</span>
                      {onOpenAISettings && currentError.includes('AI Settings') && (
                        <button
                          type="button"
                          onClick={onOpenAISettings}
                          className="ml-2 underline font-black text-black bg-white px-1"
                        >
                          Open Settings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Host Control Actions */}
                {isHost && (
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#23283A]">
                    <div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          playClickSound();
                          handleSynthesizeConsensus(poll);
                        }}
                        disabled={isSynthesizing || poll.totalVotes === 0}
                        className="px-2.5 sm:px-3 py-1.5 bg-neo-cyan hover:bg-[#33F3FF] disabled:bg-slate-800 disabled:text-slate-600 text-black text-xs font-mono font-black uppercase border border-black brutal-shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                        title={poll.totalVotes === 0 ? 'Collect votes first to synthesize consensus' : 'Analyze consensus with Mesh AI'}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{isSynthesizing ? 'ANALYZING...' : (poll.aiConsensusNote || localConsensusNotes[poll.id]) ? 'REFRESH AI' : 'AI SUMMARY'}</span>
                      </motion.button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onResetPoll && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            playClickSound();
                            onResetPoll(poll.id);
                          }}
                          className="px-2.5 py-1 bg-[#1A1E2B] hover:bg-neo-yellow hover:text-black text-slate-300 text-[11px] font-mono font-bold uppercase border border-black brutal-shadow-sm flex items-center space-x-1 transition-all cursor-pointer"
                          title="Reset all votes to zero and allow attendees to vote again"
                        >
                          <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                          <span>RESET VOTES</span>
                        </motion.button>
                      )}
                      {onDeletePoll && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            if (window.confirm(`Delete poll "${poll.question}"?`)) {
                              playClickSound();
                              onDeletePoll(poll.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-[#1A1E2B] hover:bg-neo-pink hover:text-white text-slate-300 text-[11px] font-mono font-bold uppercase border border-black brutal-shadow-sm flex items-center space-x-1 transition-all cursor-pointer"
                          title="Delete this poll"
                        >
                          <Trash2 className="w-3 h-3 stroke-[2.5]" />
                          <span>DELETE</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
