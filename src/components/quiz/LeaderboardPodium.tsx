import React from 'react';
import { Trophy, Medal, Crown, CheckCircle, Vote, Share2, Award } from 'lucide-react';
import { motion } from 'motion/react';
import type { LeaderboardEntry } from '../../types';
import { playPopSound } from '../../lib/soundFx';

interface LeaderboardPodiumProps {
  leaderboard: LeaderboardEntry[];
  compact?: boolean;
  currentUserSessionId?: string;
  currentUserName?: string;
  onExportCard?: (entry: LeaderboardEntry, rank: number) => void;
  onOpenCertificate?: () => void;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  leaderboard,
  compact = false,
  currentUserSessionId,
  currentUserName,
  onExportCard,
  onOpenCertificate,
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

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {onOpenCertificate && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playPopSound();
                onOpenCertificate();
              }}
              className="px-2 sm:px-2.5 py-1 bg-neo-yellow hover:bg-[#FFE600] text-black font-mono text-[10px] sm:text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 cursor-pointer transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              <span>CERTIFICATE</span>
            </motion.button>
          )}
          <span className="text-[10px] sm:text-xs font-mono font-black text-black bg-neo-mint px-2 sm:px-2.5 py-0.5 sm:py-1 border-2 border-black brutal-shadow-sm uppercase shrink-0">
            {leaderboard.length} PLAYERS
          </span>
        </div>
      </div>

      {!compact && top3.length > 0 && (
        <div className="p-3 sm:p-5 md:p-6 bg-neo-card-darker border-b-2 border-black bg-retro-dots overflow-hidden">
          <div className="flex items-end justify-center gap-1.5 xs:gap-3 sm:gap-4 md:gap-6 max-w-lg mx-auto pt-2">
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex flex-col items-center flex-1 max-w-23.75 xs:max-w-28 sm:max-w-32 min-w-0"
              >
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-neo-cyan border-2 border-black brutal-shadow flex items-center justify-center font-heavy text-base sm:text-xl text-black">
                    🥈
                  </div>
                  <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-white mt-1 max-w-full truncate px-1">
                    {top3[1].name}
                  </span>
                  <span className="font-mono font-black text-neo-cyan text-[10px] sm:text-xs">
                    {top3[1].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-16 xs:h-20 sm:h-24 bg-neo-cyan/20 border-2 border-black border-b-0 flex items-center justify-center font-heavy text-xl sm:text-2xl text-neo-cyan brutal-shadow-sm">
                  2
                </div>
              </motion.div>
            )}

            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center flex-1 max-w-26 xs:max-w-32 sm:max-w-36 min-w-0"
              >
                <div className="relative mb-2 flex flex-col items-center">
                  <motion.div
                    animate={{ rotate: [-3, 3, -3] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 bg-neo-yellow border-3 border-black brutal-shadow-yellow flex items-center justify-center font-heavy text-xl sm:text-3xl text-black"
                  >
                    👑
                  </motion.div>
                  <span className="font-mono text-[10px] xs:text-[11px] sm:text-sm font-black text-neo-yellow mt-1 max-w-full truncate px-1">
                    {top3[0].name}
                  </span>
                  <span className="font-mono font-black text-white text-[10px] sm:text-xs bg-black px-1.5 py-0.5 border border-neo-yellow">
                    {top3[0].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-24 xs:h-28 sm:h-36 bg-neo-yellow/25 border-3 border-black border-b-0 flex flex-col items-center justify-center font-heavy text-2xl sm:text-4xl text-neo-yellow brutal-shadow">
                  <span>1</span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase text-black bg-neo-yellow px-1 mt-1">
                    CHAMPION
                  </span>
                </div>
              </motion.div>
            )}

            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-col items-center flex-1 max-w-23.75 xs:max-w-28 sm:max-w-32 min-w-0"
              >
                <div className="relative mb-2 flex flex-col items-center">
                  <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-neo-orange border-2 border-black brutal-shadow flex items-center justify-center font-heavy text-base sm:text-xl text-white">
                    🥉
                  </div>
                  <span className="font-mono text-[9px] xs:text-[10px] sm:text-xs font-bold text-white mt-1 max-w-full truncate px-1">
                    {top3[2].name}
                  </span>
                  <span className="font-mono font-black text-neo-orange text-[10px] sm:text-xs">
                    {top3[2].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-12 xs:h-16 sm:h-20 bg-neo-orange/20 border-2 border-black border-b-0 flex items-center justify-center font-heavy text-lg sm:text-xl text-neo-orange brutal-shadow-sm">
                  3
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <div className="p-2 sm:p-4 space-y-1.5 sm:space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            NO PLAYERS YET. START A QUIZ ROUND TO CLIMB THE PODIUM!
          </div>
        ) : (
          leaderboard.map((entry, index) => {
            const isMe =
              Boolean(currentUserSessionId && entry.session_id === currentUserSessionId) ||
              Boolean(
                currentUserName &&
                entry.name &&
                entry.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
              );

            return (
              <motion.div
                key={entry.session_id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                whileHover={{ scale: 1.008, x: 2 }}
                className={`flex items-center justify-between p-2 sm:p-3 border-2 border-black brutal-shadow-sm transition-all gap-2 ${
                  isMe ? 'bg-[#22283A] ring-2 ring-neo-yellow' : 'bg-[#161924] hover:bg-[#1C202E]'
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  {getRankBadge(index)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
                      <span className="text-[11px] sm:text-xs font-bold text-white truncate uppercase font-display max-w-30 xs:max-w-44 sm:max-w-none">
                        {entry.name}
                      </span>
                      {isMe && (
                        <span className="px-1 py-0.2 bg-neo-yellow text-black text-[8px] sm:text-[9px] font-black uppercase border border-black">
                          YOU
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

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] sm:text-xs md:text-sm font-mono font-black text-neo-yellow">
                      {entry.correct_quizzes} CORRECT
                    </span>
                  </div>

                  {onExportCard && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        playPopSound();
                        onExportCard(entry, index + 1);
                      }}
                      className="p-1 sm:p-1.5 bg-[#1C2030] hover:bg-neo-cyan hover:text-black text-slate-300 border border-black text-[10px] font-mono cursor-pointer transition-all"
                      title="Export Champion Card"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
