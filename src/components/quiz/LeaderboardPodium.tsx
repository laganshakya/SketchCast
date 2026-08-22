import React from 'react';
import { Trophy, Medal, Crown, Flame, CheckCircle, Vote } from 'lucide-react';
import type { LeaderboardEntry } from '../../types';

interface LeaderboardPodiumProps {
  leaderboard: LeaderboardEntry[];
  compact?: boolean;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  leaderboard,
  compact = false,
}) => {
  const top3 = leaderboard.slice(0, 3);

  const getRankBadge = (rank: number) => {
    if (rank === 0) {
      return (
        <div className="w-8 h-8 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs">
          <Crown className="w-4 h-4 fill-black" />
        </div>
      );
    }
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-neo-orange text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs">
          <Medal className="w-4 h-4" />
        </div>
      );
    }
    return (
      <span className="w-7 h-7 bg-neo-card text-slate-400 font-mono text-xs flex items-center justify-center font-black border border-black">
        #{rank + 1}
      </span>
    );
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full bg-[#12141D] border-2 border-black brutal-shadow-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 border-b-2 border-black bg-neo-card flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center">
            <Trophy className="w-4 h-4 fill-black" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy text-white uppercase tracking-tight">
              ARCADE HIGH SCORES & PODIUM
            </h3>
          </div>
        </div>
        <span className="text-xs font-mono font-black text-black bg-neo-mint px-2.5 py-1 border-2 border-black brutal-shadow-sm uppercase">
          {leaderboard.length} PLAYERS
        </span>
      </div>

      {/* Top 3 Visual Neo-Brutalist Podium */}
      {!compact && top3.length > 0 && (
        <div className="p-6 bg-neo-card-darker border-b-2 border-black bg-retro-dots">
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-lg mx-auto pt-2">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center flex-1 max-w-32">
                <div className="w-12 h-12 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xl mb-1">
                  🥈
                </div>
                <span className="text-xs font-bold text-white uppercase truncate w-full text-center">
                  {top3[1].name}
                </span>
                <span className="text-xs font-mono font-black text-neo-cyan">
                  {top3[1].score} PTS
                </span>
                <div className="w-full h-16 bg-[#1A1E2B] border-2 border-black border-b-0 brutal-shadow-sm mt-2 flex items-center justify-center text-sm font-heavy text-neo-cyan">
                  #2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center flex-1 max-w-36">
                <div className="w-16 h-16 bg-neo-yellow text-black border-2 border-black brutal-shadow flex items-center justify-center font-heavy text-2xl mb-1 -rotate-2">
                  👑
                </div>
                <span className="text-sm font-heavy text-neo-yellow uppercase truncate w-full text-center">
                  {top3[0].name}
                </span>
                <span className="text-sm font-mono font-black text-neo-yellow">
                  {top3[0].score} PTS
                </span>
                <div className="w-full h-24 bg-neo-yellow text-black border-2 border-black border-b-0 brutal-shadow mt-2 flex items-center justify-center text-xl font-heavy">
                  #1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center flex-1 max-w-32">
                <div className="w-12 h-12 bg-neo-orange text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xl mb-1">
                  🥉
                </div>
                <span className="text-xs font-bold text-white uppercase truncate w-full text-center">
                  {top3[2].name}
                </span>
                <span className="text-xs font-mono font-black text-neo-orange">
                  {top3[2].score} PTS
                </span>
                <div className="w-full h-12 bg-[#1A1E2B] border-2 border-black border-b-0 brutal-shadow-sm mt-2 flex items-center justify-center text-xs font-heavy text-neo-orange">
                  #3
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="p-3.5 space-y-2 max-h-96 overflow-y-auto font-mono">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.session_id}
            className="flex items-center justify-between p-3 bg-[#161924] hover:bg-[#1C202E] border-2 border-black brutal-shadow-sm transition-all"
          >
            <div className="flex items-center space-x-3 min-w-0">
              {getRankBadge(index)}
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white truncate uppercase font-display">{entry.name}</span>
                  {entry.streak > 1 && (
                    <span className="flex items-center text-[10px] font-black text-black bg-neo-orange px-1.5 py-0.2 border border-black">
                      <Flame className="w-3 h-3 fill-black" /> {entry.streak}X
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 font-bold">
                    <CheckCircle className="w-3 h-3 text-neo-mint" /> {entry.correct_quizzes} QUIZZES
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold">
                    <Vote className="w-3 h-3 text-neo-cyan" /> {entry.polls_voted} POLLS
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-mono font-black text-neo-yellow">{entry.score} PTS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
