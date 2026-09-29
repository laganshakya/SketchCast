import React, { useState, useMemo } from 'react';
import { Trophy, CheckCircle, Share2, Award, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import type { LeaderboardEntry, SponsorCTA } from '../../types';
import { playPopSound, playClickSound } from '../../lib/soundFx';
import { ContextualAffiliateCard } from '../affiliate/ContextualAffiliateCard';
import { useAffiliateRecommendation } from '../../hooks/useAffiliateRecommendation';

interface LeaderboardPodiumProps {
  leaderboard: LeaderboardEntry[];
  compact?: boolean;
  currentUserSessionId?: string;
  currentUserName?: string;
  onExportCard?: (entry: LeaderboardEntry, rank: number) => void;
  onOpenCertificate?: () => void;
  roomCode?: string;
  roomTitle?: string;
  sponsorCTA?: SponsorCTA | null;
}

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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
  onExportCard?: (entry: LeaderboardEntry, rank: number) => void;
}

const LeaderboardRow = React.memo<LeaderboardRowProps>(({ entry, rank, isMe, onExportCard }) => {
  return (
    <div
      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all gap-2 ${
        isMe
          ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/25'
          : 'bg-[#121215] hover:bg-[#18181E] border-white/[0.06]'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {getRankBadge(rank)}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-semibold text-white truncate font-sans">
              {entry.name}
            </span>
            {isMe && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider">
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
            {entry.correct_quizzes * 100} PTS
          </span>
        </div>

        {onExportCard && isMe && (
          <button
            type="button"
            onClick={() => {
              playPopSound();
              onExportCard(entry, rank + 1);
            }}
            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono cursor-pointer transition-colors active:scale-95"
            title="Export Your Champion Card"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
LeaderboardRow.displayName = 'LeaderboardRow';

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  leaderboard,
  compact = false,
  currentUserSessionId,
  currentUserName,
  onExportCard,
  onOpenCertificate,
  roomCode,
  roomTitle,
  sponsorCTA,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const affiliateRec = useAffiliateRecommendation({
    placement: 'leaderboard',
    roomTitle,
    roomCode,
    sponsorCTA,
  });

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  const userRankIndex = useMemo(() => {
    return leaderboard.findIndex(
      (entry) =>
        (currentUserSessionId && entry.session_id === currentUserSessionId) ||
        Boolean(
          currentUserName &&
          entry.name &&
          entry.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
        )
    );
  }, [leaderboard, currentUserSessionId, currentUserName]);

  const userEntry = userRankIndex !== -1 ? leaderboard[userRankIndex] : null;

  // Filter by search query
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase().trim();
    return leaderboard.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [leaderboard, searchQuery]);

  // Scalable pagination: show top 15 by default unless expanded or searching
  const visibleList = useMemo(() => {
    if (searchQuery.trim() || isExpanded || compact) {
      return filteredLeaderboard;
    }
    return filteredLeaderboard.slice(0, 15);
  }, [filteredLeaderboard, searchQuery, isExpanded, compact]);

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
            {leaderboard.length} {leaderboard.length === 1 ? 'PLAYER' : 'PLAYERS'}
          </span>
        </div>
      </div>

      {/* Podium Steps or Solo Champion Showcase */}
      {!compact && top3.length > 0 && (
        <div className="p-4 sm:p-6 md:p-8 bg-[#0A0A0C] border-b border-white/[0.08] overflow-hidden">
          {top3.length === 1 ? (
            /* Solo Champion Showcase Card */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-blue-950/30 via-[#121218] to-[#0E0E12] border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.12)] text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-bold mb-1">
                ARENA LEADER & CHAMPION
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight mb-3">
                {top3[0].name}
              </h2>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-xs font-bold">
                  RANK #1
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {top3[0].correct_quizzes} CORRECT
                </span>
                <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
                  {top3[0].correct_quizzes * 100} PTS
                </span>
              </div>
              {onExportCard && (
                <div className="pt-4 flex justify-center">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playPopSound();
                      onExportCard(top3[0], 1);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase flex items-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>EXPORT CHAMPION CARD</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            /* Multi-Player Podium */
            <div className="max-w-2xl mx-auto pt-2 sm:pt-4">
              <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-5">
                {/* Rank 2 (Silver) */}
                {top3[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex flex-col items-center flex-1 max-w-[120px] sm:max-w-44 md:max-w-48 min-w-0"
                  >
                    <div className="mb-2 flex flex-col items-center text-center w-full px-1">
                      <span className="font-mono text-[9px] sm:text-[10px] text-zinc-400 tracking-wider uppercase font-semibold">
                        RANK 02
                      </span>
                      <span className="font-display text-xs sm:text-sm font-bold text-white truncate w-full" title={top3[1].name}>
                        {top3[1].name}
                      </span>
                      <span className="font-mono text-[10px] sm:text-xs text-zinc-400 font-medium">
                        {top3[1].correct_quizzes * 100} PTS
                      </span>
                    </div>
                    <div className="w-full h-20 sm:h-28 bg-[#14141A] border border-white/[0.12] rounded-t-xl flex flex-col items-center justify-center shadow-sm">
                      <span className="font-display font-black text-2xl sm:text-4xl text-zinc-500">
                        02
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Rank 1 - Champion Monolith (Gold/Cobalt) */}
                {top3[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center flex-1 max-w-[140px] sm:max-w-52 md:max-w-56 min-w-0"
                  >
                    <div className="mb-2 flex flex-col items-center text-center w-full px-1">
                      <span className="font-mono text-[10px] sm:text-xs font-bold text-blue-400 tracking-widest uppercase flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>CHAMPION</span>
                      </span>
                      <span className="font-display text-sm sm:text-base font-extrabold text-white truncate w-full" title={top3[0].name}>
                        {top3[0].name}
                      </span>
                      <span className="font-mono text-[10px] sm:text-xs font-bold text-emerald-400">
                        {top3[0].correct_quizzes * 100} PTS ({top3[0].correct_quizzes} SOLVED)
                      </span>
                    </div>
                    <div className="w-full h-32 sm:h-44 bg-gradient-to-b from-blue-900/40 via-blue-950/30 to-[#101018] border border-blue-500/50 rounded-t-2xl flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(59,130,246,0.18)]">
                      <div className="text-[10px] font-mono tracking-widest text-blue-300 uppercase mb-0.5 font-bold">
                        RANK 01
                      </div>
                      <span className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
                        01
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Rank 3 (Bronze) */}
                {top3[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex flex-col items-center flex-1 max-w-[120px] sm:max-w-44 md:max-w-48 min-w-0"
                  >
                    <div className="mb-2 flex flex-col items-center text-center w-full px-1">
                      <span className="font-mono text-[9px] sm:text-[10px] text-zinc-500 tracking-wider uppercase font-semibold">
                        RANK 03
                      </span>
                      <span className="font-display text-xs sm:text-sm font-bold text-white truncate w-full" title={top3[2].name}>
                        {top3[2].name}
                      </span>
                      <span className="font-mono text-[10px] sm:text-xs text-zinc-400 font-medium">
                        {top3[2].correct_quizzes * 100} PTS
                      </span>
                    </div>
                    <div className="w-full h-16 sm:h-22 bg-[#121216] border border-white/[0.08] rounded-t-xl flex flex-col items-center justify-center">
                      <span className="font-display font-black text-xl sm:text-3xl text-zinc-600">
                        03
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
              {/* Solid Grounded Base Platform Line */}
              <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-full mt-0" />
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-3 sm:p-4 space-y-2.5">
        {/* Sticky "Your Standing" Spotlight Card: Only show if user is outside top 3 */}
        {userEntry && (userRankIndex >= 3 || (leaderboard.length > 5 && userRankIndex > 2)) && (
          <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-transparent border border-blue-500/35 flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(59,130,246,0.1)]">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono text-xs font-black shrink-0 shadow-sm">
                #{userRankIndex + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">
                    YOUR CURRENT STANDING
                  </span>
                  <span className="px-1.5 py-0.2 bg-blue-500 text-white text-[8px] font-mono font-bold rounded">
                    YOU
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate font-sans">
                  {userEntry.name}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right">
                <span className="text-xs sm:text-sm font-mono font-bold text-blue-400">
                  {userEntry.correct_quizzes * 100} PTS
                </span>
              </div>
              {onExportCard && (
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    onExportCard(userEntry, userRankIndex + 1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
                  title="Export Champion Card"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CARD</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Bar for 15+ Players */}
        {leaderboard.length > 15 && (
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${leaderboard.length} attendees...`}
              className="w-full pl-9 pr-4 py-2 bg-[#0E0E12] border border-white/[0.08] focus:border-blue-500/50 rounded-xl text-xs font-mono text-zinc-200 placeholder:text-zinc-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Scalable Leaderboard List */}
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 font-mono text-xs">
              NO RANKED PLAYERS YET. LAUNCH A ROUND TO ENTER THE PODIUM.
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 font-mono text-xs">
              NO PLAYERS FOUND MATCHING &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            visibleList.map((entry) => {
              // Find global rank index
              const originalIndex = leaderboard.findIndex((item) => item.session_id === entry.session_id);
              const rank = originalIndex !== -1 ? originalIndex : 0;
              const isMe =
                Boolean(currentUserSessionId && entry.session_id === currentUserSessionId) ||
                Boolean(
                  currentUserName &&
                  entry.name &&
                  entry.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
                );

              return (
                <LeaderboardRow
                  key={entry.session_id}
                  entry={entry}
                  rank={rank}
                  isMe={isMe}
                  onExportCard={onExportCard}
                />
              );
            })
          )}
        </div>

        {/* Expand / Collapse Toggle for 15+ players */}
        {!searchQuery && filteredLeaderboard.length > 15 && !compact && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsExpanded(!isExpanded);
            }}
            className="w-full py-2.5 mt-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-mono font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>
              {isExpanded ? 'SHOW TOP 15 ONLY' : `SHOW ALL ${leaderboard.length} PLAYERS`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        )}

        {/* Next Level Career Acceleration Path */}
        {affiliateRec && !compact && (
          <div className="mt-5 pt-4 border-t border-white/[0.08]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">
              CAREER ACCELERATION & BENCHMARKS
            </div>
            <ContextualAffiliateCard recommendation={affiliateRec} />
          </div>
        )}
      </div>
    </div>
  );
};
