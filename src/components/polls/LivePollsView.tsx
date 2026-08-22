import React from 'react';
import { Plus, CheckCircle2, Users, Clock, Sparkles, Vote } from 'lucide-react';
import type { LivePoll } from '../../types';

interface LivePollsViewProps {
  polls: LivePoll[];
  userVotes: Record<string, string>;
  onVote: (pollId: string, optionId: string) => void;
  onOpenCreatePoll: () => void;
  isHost?: boolean;
}

export const LivePollsView: React.FC<LivePollsViewProps> = ({
  polls,
  userVotes,
  onVote,
  onOpenCreatePoll,
  isHost = false,
}) => {
  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60));
    if (mins < 1) return 'JUST NOW';
    if (mins < 60) return `${mins}M AGO`;
    return `${Math.floor(mins / 60)}H AGO`;
  };

  const getOptionFillColor = (idx: number, isVoted: boolean) => {
    if (isVoted) return 'bg-[#FFE600]';
    switch (idx % 4) {
      case 0:
        return 'bg-[#00F0FF]';
      case 1:
        return 'bg-[#00F59B]';
      case 2:
        return 'bg-[#9B5DE5]';
      case 3:
        return 'bg-[#FF6B35]';
      default:
        return 'bg-[#FFE600]';
    }
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full p-3 sm:p-5 space-y-4 font-sans">
      {/* Header */}
      <div className="bg-[#151822] p-4 border-2 border-black brutal-shadow flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-[#00F0FF] text-black font-mono font-black text-[10px] uppercase border border-black brutal-shadow-sm">
              LIVE_VOTING // V2.0
            </span>
            <span className="font-mono text-xs font-bold text-slate-400">REAL-TIME CONSENSUS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heavy text-white uppercase font-display tracking-tight mt-1">
            COMMUNITY ARCHITECTURE POLLS
          </h2>
        </div>

        {/* Host only can create new polls */}
        {isHost ? (
          <button
            onClick={onOpenCreatePoll}
            className="px-4 py-2 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow flex items-center space-x-1.5 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>NEW POLL</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 bg-[#1A1E2B] border-2 border-black brutal-shadow-sm text-xs font-mono font-bold text-[#00F59B] flex items-center space-x-1.5 flex-shrink-0">
            <Vote className="w-4 h-4" />
            <span className="hidden sm:inline">VOTING ACTIVE</span>
          </div>
        )}
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="bg-[#151822] p-8 border-2 border-black brutal-shadow text-center space-y-3">
            <Sparkles className="w-8 h-8 text-[#FFE600] mx-auto" />
            <h3 className="text-lg font-heavy uppercase text-white font-display">
              NO ACTIVE COMMUNITY POLLS
            </h3>
            <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
              {isHost
                ? 'Launch a poll from the button above to gather real-time consensus from your attendees!'
                : 'Stand by. The Host will broadcast community architecture polls during the live session.'}
            </p>
            {isHost && (
              <button
                onClick={onOpenCreatePoll}
                className="mt-2 px-4 py-2 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>CREATE FIRST POLL</span>
              </button>
            )}
          </div>
        ) : (
          polls.map((poll) => {
            const userVotedOptionId = userVotes[poll.id];

            return (
              <div
                key={poll.id}
                className="bg-[#161924] p-4 sm:p-5 border-2 border-black brutal-shadow-lg space-y-3.5 relative overflow-hidden"
              >
                {/* Poll Header Bar */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400 mb-1">
                      <span className="font-bold text-[#FFE600] uppercase">BY {poll.author_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {timeAgo(poll.created_at)}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-heavy text-white uppercase font-display leading-tight">
                      {poll.question}
                    </h3>
                  </div>

                  <span className="flex items-center space-x-1 px-2.5 py-1 bg-black text-[#FFE600] border-2 border-black brutal-shadow-sm text-xs font-mono font-black flex-shrink-0">
                    <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{poll.totalVotes} VOTES</span>
                  </span>
                </div>

                {/* Poll Options Grid */}
                <div className="space-y-2 font-mono">
                  {poll.options.map((option, idx) => {
                    const isVoted = userVotedOptionId === option.id;
                    const percentage =
                      poll.totalVotes > 0
                        ? Math.round((option.votesCount / poll.totalVotes) * 100)
                        : 0;

                    return (
                      <button
                        key={option.id}
                        onClick={() => onVote(poll.id, option.id)}
                        className={`w-full p-3 border-2 border-black text-left transition-all relative overflow-hidden flex items-center justify-between group ${
                          isVoted
                            ? 'bg-[#1C2030] border-[#FFE600] brutal-shadow-yellow text-white'
                            : 'bg-[#12141D] hover:bg-[#191D2B] text-slate-200 hover:text-white brutal-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                        }`}
                      >
                        {/* Animated Percentage Fill Bar */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 opacity-20 ${getOptionFillColor(
                            idx,
                            isVoted
                          )}`}
                          style={{ width: `${percentage}%` }}
                        />

                        {/* Content */}
                        <div className="flex items-center space-x-2.5 relative z-10 min-w-0 pr-3">
                          <div
                            className={`w-6 h-6 border-2 border-black flex items-center justify-center font-heavy text-xs flex-shrink-0 ${
                              isVoted ? 'bg-[#FFE600] text-black' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isVoted ? (
                              <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />
                            ) : (
                              option.id.replace('opt-', '')
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-bold font-sans tracking-tight">
                            {option.text}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center space-x-1.5 relative z-10 flex-shrink-0 font-mono text-xs font-black">
                          <span className="text-[#FFE600] text-sm">{percentage}%</span>
                          <span className="text-slate-500 hidden sm:inline">
                            ({option.votesCount})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
