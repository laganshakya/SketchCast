import React from 'react';
import { Trophy, CheckCircle, Share2, Award } from 'lucide-react';
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
        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono text-xs font-black shrink-0 shadow-sm">
          01
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold shrink-0">
          02
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-lg bg-zinc-850 text-zinc-300 border border-white/[0.06] flex items-center justify-center font-mono text-xs font-bold shrink-0">
          03
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-lg bg-[#141418] text-zinc-500 font-mono text-[11px] flex items-center justify-center font-semibold border border-white/[0.06] shrink-0">
        {rank + 1 < 10 ? `0${rank + 1}` : rank + 1}
      </span>
    );
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full bg-[#121215] border border-white/[0.08] rounded-2xl overflow-hidden font-sans shadow-sm mb-4">
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-white/[0.08] bg-[#0E0E11] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold">
              ARENA STANDINGS
            </div>
            <h3 className="text-xs sm:text-base font-display font-extrabold text-white uppercase tracking-tight">
              LIVE RANKINGS & PODIUM
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {onOpenCertificate && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playPopSound();
                onOpenCertificate();
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 text-xs font-mono font-bold uppercase flex items-center space-x-1.5 cursor-pointer transition-all"
            >
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <span>CERTIFICATE</span>
            </motion.button>
          )}
          <span className="text-[11px] sm:text-xs font-mono font-bold text-zinc-300 bg-[#18181D] px-2.5 sm:px-3 py-1 rounded-full border border-white/[0.08] uppercase shrink-0">
            {leaderboard.length} PLAYERS
          </span>
        </div>
      </div>

      {/* Podium Steps */}
      {!compact && top3.length > 0 && (
        <div className="p-3 sm:p-6 md:p-8 bg-[#0A0A0C] border-b border-white/[0.08] overflow-hidden">
          <div className="flex items-end justify-center gap-1.5 sm:gap-4 md:gap-6 max-w-xl mx-auto pt-2 sm:pt-4">
            {/* Rank 2 */}
            {top3[1] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-36 min-w-0"
              >
                <div className="mb-1.5 sm:mb-2 flex flex-col items-center text-center w-full px-1">
                  <span className="font-mono text-[9px] sm:text-[10px] text-zinc-500 tracking-wider uppercase font-semibold">
                    RANK 02
                  </span>
                  <span className="font-display text-[11px] sm:text-sm font-bold text-white truncate w-full">
                    {top3[1].name}
                  </span>
                  <span className="font-mono text-[9px] sm:text-[11px] text-zinc-400">
                    {top3[1].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-16 sm:h-28 bg-[#14141A] border border-white/[0.08] border-b-0 rounded-t-xl flex flex-col items-center justify-center">
                  <span className="font-display font-black text-xl sm:text-4xl text-zinc-600">
                    02
                  </span>
                </div>
              </motion.div>
            )}

            {/* Rank 1 - Champion Monolith */}
            {top3[0] && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-44 min-w-0"
              >
                <div className="mb-1.5 sm:mb-2 flex flex-col items-center text-center w-full px-1">
                  <span className="font-mono text-[9px] sm:text-[10px] font-bold text-blue-400 tracking-widest uppercase">
                    CHAMPION
                  </span>
                  <span className="font-display text-xs sm:text-base font-extrabold text-white truncate w-full">
                    {top3[0].name}
                  </span>
                  <span className="font-mono text-[9px] sm:text-xs font-bold text-blue-400">
                    {top3[0].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-24 sm:h-44 bg-blue-950/20 border border-blue-500/40 border-b-0 rounded-t-xl flex flex-col items-center justify-center relative shadow-[0_0_24px_rgba(59,130,246,0.12)]">
                  <div className="text-[9px] sm:text-[10px] font-mono tracking-widest text-blue-400 uppercase mb-1 font-bold">
                    TOP SCORE
                  </div>
                  <span className="font-display font-black text-3xl sm:text-6xl text-white tracking-tighter">
                    01
                  </span>
                </div>
              </motion.div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-36 min-w-0"
              >
                <div className="mb-1.5 sm:mb-2 flex flex-col items-center text-center w-full px-1">
                  <span className="font-mono text-[9px] sm:text-[10px] text-zinc-500 tracking-wider uppercase font-semibold">
                    RANK 03
                  </span>
                  <span className="font-display text-[11px] sm:text-sm font-bold text-white truncate w-full">
                    {top3[2].name}
                  </span>
                  <span className="font-mono text-[9px] sm:text-[11px] text-zinc-400">
                    {top3[2].correct_quizzes} CORRECT
                  </span>
                </div>
                <div className="w-full h-12 sm:h-22 bg-[#121216] border border-white/[0.08] border-b-0 rounded-t-xl flex flex-col items-center justify-center">
                  <span className="font-display font-black text-lg sm:text-3xl text-zinc-700">
                    03
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="p-3 sm:p-4 space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 font-mono text-xs">
            NO RANKED PLAYERS YET. LAUNCH A ROUND TO ENTER THE PODIUM.
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all gap-2 ${
                  isMe
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-[#121215] hover:bg-[#18181E] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {getRankBadge(index)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-semibold text-white truncate font-sans">
                        {entry.name}
                      </span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-mono font-bold uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle className="w-2.5 h-2.5" /> {entry.correct_quizzes} CORRECT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">
                      {entry.correct_quizzes} PTS
                    </span>
                  </div>

                  {onExportCard && isMe && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        playPopSound();
                        onExportCard(entry, index + 1);
                      }}
                      className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono cursor-pointer transition-colors"
                      title="Export Your Champion Card"
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
