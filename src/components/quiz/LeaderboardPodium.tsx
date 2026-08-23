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
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs shrink-0">
          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black" />
        </div>
      );
    }
    if (rank === 1) {
      return (
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs shrink-0">
          <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-orange text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-xs shrink-0">
          <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      );
    }
    return (
      <span className="w-6 h-6 sm:w-7 sm:h-7 bg-neo-card text-slate-400 font-mono text-[10px] sm:text-xs flex items-center justify-center font-black border border-black shrink-0">
        #{rank + 1}
      </span>
    );
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full bg-[#12141D] border-2 border-black brutal-shadow-lg overflow-hidden font-sans mb-24 md:mb-6">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b-2 border-black bg-neo-card flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center shrink-0">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black" />
          </div>
          <div>
            <h3 className="text-xs sm:text-base md:text-lg font-heavy text-white uppercase tracking-tight">
              ARCADE HIGH SCORES & PODIUM
            </h3>
          </div>
        </div>
        <span className="text-[10px] sm:text-xs font-mono font-black text-black bg-neo-mint px-2 sm:px-2.5 py-0.5 sm:py-1 border-2 border-black brutal-shadow-sm uppercase shrink-0">
          {leaderboard.length} PLAYERS
        </span>
      </div>

      {/* Top 3 Visual Neo-Brutalist Podium */}
      {!compact && top3.length > 0 && (
        <div className="p-3 sm:p-5 md:p-6 bg-neo-card-darker border-b-2 border-black bg-retro-dots">
          <div className="flex items-end justify-center gap-1.5 xs:gap-3 sm:gap-4 md:gap-6 max-w-lg mx-auto pt-2">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="flex flex-col items-center flex-1 max-w-23.75 xs:max-w-28 sm:max-w-32 min-w-0">
                <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-sm xs:text-base sm:text-xl mb-1">
                  🥈
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white uppercase truncate w-full text-center">
                  {top3[1].name}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono font-black text-neo-cyan truncate">
                  {top3[1].score} PTS
                </span>
                <div className="w-full h-10 xs:h-12 sm:h-16 bg-[#1A1E2B] border-2 border-black border-b-0 brutal-shadow-sm mt-1.5 sm:mt-2 flex items-center justify-center text-xs sm:text-sm font-heavy text-neo-cyan">
                  #2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className="flex flex-col items-center flex-1 max-w-27.5 xs:max-w-32 sm:max-w-36 min-w-0">
                <div className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 bg-neo-yellow text-black border-2 border-black brutal-shadow flex items-center justify-center font-heavy text-lg xs:text-xl sm:text-2xl mb-1 -rotate-2">
                  👑
                </div>
                <span className="text-xs sm:text-sm font-heavy text-neo-yellow uppercase truncate w-full text-center">
                  {top3[0].name}
                </span>
                <span className="text-[10px] xs:text-[11px] sm:text-sm font-mono font-black text-neo-yellow truncate">
                  {top3[0].score} PTS
                </span>
                <div className="w-full h-14 xs:h-18 sm:h-24 bg-neo-yellow text-black border-2 border-black border-b-0 brutal-shadow mt-1.5 sm:mt-2 flex items-center justify-center text-base xs:text-lg sm:text-xl font-heavy">
                  #1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="flex flex-col items-center flex-1 max-w-23.75 xs:max-w-28 sm:max-w-32 min-w-0">
                <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-12 sm:h-12 bg-neo-orange text-white border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy text-sm xs:text-base sm:text-xl mb-1">
                  🥉
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white uppercase truncate w-full text-center">
                  {top3[2].name}
                </span>
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-mono font-black text-neo-orange truncate">
                  {top3[2].score} PTS
                </span>
                <div className="w-full h-8 xs:h-10 sm:h-12 bg-[#1A1E2B] border-2 border-black border-b-0 brutal-shadow-sm mt-1.5 sm:mt-2 flex items-center justify-center text-[10px] xs:text-[11px] sm:text-xs font-heavy text-neo-orange">
                  #3
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="p-2 sm:p-3.5 space-y-1.5 sm:space-y-2 max-h-96 overflow-y-auto font-mono pb-20 md:pb-4">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs uppercase">
            No player scores yet. Vote in polls and quizzes to climb the leaderboard!
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.session_id}
              className="flex items-center justify-between p-2 sm:p-3 bg-[#161924] hover:bg-[#1C202E] border-2 border-black brutal-shadow-sm transition-all gap-2"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                {getRankBadge(index)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-0.5">
                    <span className="text-[11px] sm:text-xs font-bold text-white truncate uppercase font-display max-w-30 xs:max-w-44 sm:max-w-none">
                      {entry.name}
                    </span>
                    {entry.streak > 1 && (
                      <span className="flex items-center text-[8px] xs:text-[9px] sm:text-[10px] font-black text-black bg-neo-orange px-1 sm:px-1.5 py-0.2 border border-black shrink-0">
                        <Flame className="w-2.5 h-2.5 fill-black" /> {entry.streak}X
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 xs:space-x-2 text-[8px] xs:text-[9px] sm:text-[10px] text-slate-400 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-0.5 font-bold">
                      <CheckCircle className="w-2.5 h-2.5 text-neo-mint" /> {entry.correct_quizzes} QUIZZES
                    </span>
                    <span className="hidden xs:inline">•</span>
                    <span className="flex items-center gap-0.5 font-bold">
                      <Vote className="w-2.5 h-2.5 text-neo-cyan" /> {entry.polls_voted} POLLS
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] sm:text-xs md:text-sm font-mono font-black text-neo-yellow">{entry.score} PTS</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
