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
    <div className="flex flex-col max-w-4xl mx-auto w-full space-y-4 font-sans mb-4">
      {/* Header */}
      <div className="bg-paper p-4 sm:p-5 border border-hairline rounded-3xl card-noma flex items-center justify-between flex-wrap gap-2.5">
        <div>
          <div className="flex items-center space-x-2 text-xs mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange/15 dark:bg-orange/20 text-orange font-bold border border-orange/40 dark:border-orange/30">
              Live Consensus
            </span>
            <span className="text-muted font-semibold">Audience Feedback</span>
          </div>
          <h2 className="text-base sm:text-xl font-serif font-bold text-ink tracking-tight">
            Community Architecture Polls
          </h2>
        </div>

        {/* Host only can create new polls */}
        {isHost ? (
          <motion.button
            whileTap={{ y: 1 }}
            onClick={() => {
              playClickSound();
              onOpenCreatePoll();
            }}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] btn-noma-orange text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Poll</span>
          </motion.button>
        ) : (
          <div className="px-3 py-1.5 bg-lime/20 border border-lime text-ink rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 shrink-0">
            <Vote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Voting Active</span>
          </div>
        )}
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="bg-paper p-8 sm:p-12 border border-hairline rounded-3xl card-noma text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange/15 dark:bg-orange/20 text-orange border border-orange/40 dark:border-orange/30 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <span className="px-2.5 py-0.5 bg-paper-surface text-ink border border-hairline-strong text-xs font-mono font-bold rounded-full uppercase tracking-wider">
                Consensus Queue Empty
              </span>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-ink mt-2">
                No Active Community Polls
              </h3>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                {isHost
                  ? 'Launch a poll using the action above to poll the audience on technical architecture choices.'
                  : 'Standing by. The Keynote Host will broadcast community architecture polls during this session.'}
              </p>
            </div>
            {isHost && (
              <motion.button
                whileTap={{ y: 1 }}
                onClick={() => {
                  playClickSound();
                  onOpenCreatePoll();
                }}
                className="mt-2 px-5 py-2.5 btn-noma-orange text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Poll</span>
              </motion.button>
            )}
          </div>
        ) : (
          polls.map((poll) => {
            const userVotedOptionId = userVotes[poll.id];
            const isVotingThisPoll = votingPollId === poll.id;

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-paper p-4 sm:p-5 border border-hairline rounded-3xl card-noma space-y-3.5 relative overflow-hidden"
              >
                {/* Poll Header Bar */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-[11px] text-muted mb-1 font-mono">
                      <span className="font-semibold text-ink">By {poll.author_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted" />
                        {timeAgo(poll.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-ink leading-snug">
                      {poll.question}
                    </h3>
                  </div>

                  <span className="flex items-center space-x-1.5 px-3 py-1 bg-paper-surface text-ink border border-hairline rounded-full text-xs font-mono font-bold shrink-0">
                    <Users className="w-3.5 h-3.5 text-orange" />
                    <span>{poll.totalVotes} Votes</span>
                  </span>
                </div>

                {/* Poll Options Grid */}
                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const isVoted = userVotedOptionId === option.id;
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votesCount / poll.totalVotes) * 100)
                        : 0;

                    return (
                      <motion.button
                        key={option.id}
                        whileTap={isVotingThisPoll ? {} : { y: 1 }}
                        onClick={() => {
                          if (!isVotingThisPoll) {
                            playPopSound();
                            setVotingPollId(poll.id);
                            setTimeout(() => {
                              setVotingPollId((current) => (current === poll.id ? null : current));
                            }, 300);
                            onVote(poll.id, option.id);
                          }
                        }}
                        disabled={isVotingThisPoll}
                        title={isVoted ? 'Click to withdraw your vote' : 'Click to vote for this option'}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex items-center justify-between group ${
                          isVoted
                            ? 'bg-lime/20 border-lime shadow-sm text-ink ring-1 ring-lime/40 cursor-pointer'
                            : isVotingThisPoll
                            ? 'bg-paper text-muted border-hairline opacity-70 cursor-not-allowed pointer-events-none'
                            : 'bg-paper-surface hover:bg-paper text-ink border-hairline hover:border-ink/40 cursor-pointer'
                        }`}
                      >
                        {/* Animated Percentage Fill Bar */}
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-2xl ${
                            isVoted ? 'bg-lime/30' : 'bg-paper-surface/60'
                          }`}
                          style={{ width: `${percentage}%` }}
                          transition={{ duration: 0.35 }}
                        />

                        {/* Content */}
                        <div className="flex items-center space-x-3 relative z-10 min-w-0 pr-3">
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center font-mono text-xs shrink-0 font-bold ${
                              isVoted
                                ? 'bg-ink text-paper dark:bg-lime dark:text-ink border-hairline'
                                : 'bg-paper text-muted border-hairline'
                            }`}
                          >
                            {isVoted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-lime dark:text-ink stroke-[2.5]" />
                            ) : (
                              option.id.replace('opt-', '')
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-semibold tracking-normal text-ink">
                            {option.text}
                          </span>
                        </div>

                        {/* Stats with Exaggerated Typography */}
                        <div className="flex items-center space-x-2 relative z-10 shrink-0 font-mono">
                          <span className="text-sm sm:text-base font-bold text-ink">
                            {percentage}%
                          </span>
                          <span className="text-[11px] text-muted hidden sm:inline">
                            ({option.votesCount})
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Rendered AI Consensus Note */}
                {(poll.aiConsensusNote || localConsensusNotes[poll.id]) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-paper-surface border border-hairline rounded-2xl text-xs text-ink space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-ink">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-orange" />
                        <span className="font-bold">Audience Consensus Analysis</span>
                      </span>
                      <span className="px-2 py-0.5 bg-orange/10 text-orange rounded-full border border-orange/20 text-[10px] font-mono font-bold">
                        AI Engine
                      </span>
                    </div>
                    <p className="text-muted text-xs leading-relaxed">
                      {poll.aiConsensusNote || localConsensusNotes[poll.id]}
                    </p>
                  </motion.div>
                )}

                {aiError?.pollId === poll.id && (
                  <div className="p-3 bg-orange/15 text-orange text-xs border border-orange/30 rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange" />
                    <div className="flex-1">
                      <span>{aiError.message}</span>
                      {onOpenAISettings && (
                        <button
                          type="button"
                          onClick={onOpenAISettings}
                          className="ml-2 underline font-semibold text-ink cursor-pointer"
                        >
                          Open Settings
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Host Control Actions */}
                {isHost && (
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-hairline">
                    <div>
                      <motion.button
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={() => {
                          playClickSound();
                          handleSynthesizeConsensus(poll);
                        }}
                        disabled={synthesizingPollId === poll.id || poll.totalVotes === 0}
                        className="px-3.5 py-1.5 bg-paper hover:bg-paper-surface disabled:opacity-50 text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                        title={poll.totalVotes === 0 ? 'Collect votes first to synthesize consensus' : 'Analyze consensus with Mesh AI'}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-orange shrink-0" />
                        <span>
                          {synthesizingPollId === poll.id
                            ? 'Analyzing...'
                            : poll.aiConsensusNote || localConsensusNotes[poll.id]
                            ? 'Refresh AI'
                            : 'AI Summary'}
                        </span>
                      </motion.button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {onResetPoll && (
                        <motion.button
                          whileTap={{ y: 1 }}
                          onClick={() => {
                            playClickSound();
                            onResetPoll(poll.id);
                          }}
                          className="px-3 py-1.5 bg-paper hover:bg-paper-surface text-muted hover:text-ink text-xs font-semibold rounded-xl border border-hairline hover:border-ink flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Reset all votes to zero"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </motion.button>
                      )}
                      {onDeletePoll && (
                        <motion.button
                          whileTap={{ y: 1 }}
                          onClick={() => {
                            if (window.confirm(`Delete poll "${poll.question}"?`)) {
                              playClickSound();
                              onDeletePoll(poll.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-paper hover:bg-orange/15 text-muted hover:text-orange text-xs font-semibold rounded-xl border border-hairline hover:border-orange/30 flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Delete this poll"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
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

      {/* Mobile Bottom Clearance Spacer */}
      <div className="h-10 sm:h-12 md:hidden w-full shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
};
