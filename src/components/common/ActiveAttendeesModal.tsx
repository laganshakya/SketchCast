import React, { useEffect } from 'react';
import { X, Crown, User, Radio, Sparkles, UserX, RefreshCw } from 'lucide-react';
import type { AttendeePresence, Room, LeaderboardEntry } from '../../types';
import { isUserRoomAdmin } from '../../lib/supabase';
import { calculateUserBadges, getRarityBadgeStyle } from '../../lib/badgeSystem';

interface ActiveAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: AttendeePresence[];
  leaderboard?: LeaderboardEntry[];
  currentSessionId: string;
  isHost: boolean;
  roomCode: string;
  room?: Room | null;
  onPromoteToAdmin?: (sessionId: string, name: string) => void;
  onDemoteFromAdmin?: (sessionId: string, name: string) => void;
  onRefresh?: () => void;
}

export const ActiveAttendeesModal: React.FC<ActiveAttendeesModalProps> = ({
  isOpen,
  onClose,
  attendees,
  leaderboard = [],
  currentSessionId,
  isHost,
  roomCode,
  room,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onRefresh,
}) => {
  useEffect(() => {
    if (isOpen && onRefresh) {
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  // Deduplicate attendees strictly by session_id
  const uniqueAttendees = Array.from(
    new Map(
      attendees
        .filter((a) => Boolean(a && a.session_id))
        .map((a) => [a.session_id, a])
    ).values()
  );

  const isAttendeeAdmin = (att: AttendeePresence) => {
    if (att.role === 'host') return true;
    if (room && isUserRoomAdmin(room, null, att.name)) return true;
    return false;
  };

  const isAttendeeOwner = (att: AttendeePresence) => {
    if (!room || !room.host_name) return false;
    return att.name.trim().toLowerCase() === room.host_name.trim().toLowerCase();
  };

  // Sort: Host & Admins first, then alphabetically
  const sortedAttendees = [...uniqueAttendees].sort((a, b) => {
    const aAdmin = isAttendeeAdmin(a);
    const bAdmin = isAttendeeAdmin(b);
    if (aAdmin && !bAdmin) return -1;
    if (!aAdmin && bAdmin) return 1;
    return a.name.localeCompare(b.name);
  });

  const totalOnline = Math.max(1, sortedAttendees.length);
  const adminCount = sortedAttendees.filter(isAttendeeAdmin).length;
  const attendeeCount = Math.max(0, totalOnline - adminCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer shrink-0 z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4 pr-8 sm:pr-10">
          <div className="flex items-start space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-mint text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy -rotate-2 shrink-0">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-heavy uppercase tracking-tight text-black leading-tight">
                  ACTIVE PARTICIPANTS
                </h3>
                <span className="px-1.5 sm:px-2 py-0.2 bg-black text-neo-yellow font-mono text-[9px] sm:text-[10px] font-black border border-black uppercase shrink-0">
                  ROOM {roomCode}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5 leading-snug">
                Live connected users and room admin management
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 bg-white hover:bg-neo-yellow text-black border-2 border-black font-mono text-xs font-black flex items-center gap-1 cursor-pointer brutal-shadow-sm active:translate-x-px active:translate-y-px transition-all shrink-0"
              title="Refresh live participant presence"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[10px]">SYNC</span>
            </button>
          )}
        </div>

        {/* Counter Metric Summary Badges */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4 font-mono text-xs">
          <div className="p-1.5 sm:p-2 bg-white border-2 border-black flex flex-col items-center justify-center text-center">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase truncate w-full">TOTAL ONLINE</span>
            <span className="text-base sm:text-lg font-black text-black leading-none mt-0.5">{totalOnline}</span>
          </div>
          <div className="p-1.5 sm:p-2 bg-amber-50 border-2 border-black flex flex-col items-center justify-center text-center">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase truncate w-full">ROOM ADMINS</span>
            <span className="text-base sm:text-lg font-black text-amber-800 leading-none mt-0.5">{adminCount}</span>
          </div>
          <div className="p-1.5 sm:p-2 bg-emerald-50 border-2 border-black flex flex-col items-center justify-center text-center">
            <span className="text-[8px] xs:text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase truncate w-full">ATTENDEES</span>
            <span className="text-base sm:text-lg font-black text-emerald-800 leading-none mt-0.5">{attendeeCount}</span>
          </div>
        </div>

        {/* Attendees List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono">
          {sortedAttendees.map((attendee) => {
            const isSelf = attendee.session_id === currentSessionId;
            const isMemberAdmin = isAttendeeAdmin(attendee);
            const isOwner = isAttendeeOwner(attendee);

            const lbEntryIndex = (leaderboard || []).findIndex((e) => e.session_id === attendee.session_id);
            const lbEntry = lbEntryIndex >= 0 ? leaderboard![lbEntryIndex] : null;
            const attendeeBadges = lbEntry
              ? calculateUserBadges({
                  correctQuizzes: lbEntry.correct_quizzes,
                  streak: lbEntry.streak,
                  rank: lbEntryIndex + 1,
                  pollsVoted: lbEntry.polls_voted,
                })
              : [];

            return (
              <div
                key={attendee.session_id}
                className={`p-2.5 sm:p-3 border-2 border-black transition-all flex flex-col xs:flex-row xs:items-center justify-between gap-2 ${
                  isMemberAdmin
                    ? 'bg-amber-100/70 border-black brutal-shadow-sm'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-2 border-black shrink-0 font-black text-xs ${
                      isMemberAdmin ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                    }`}
                  >
                    {isMemberAdmin ? <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-0.5">
                      <span className="text-xs font-black text-black truncate max-w-32.5 sm:max-w-none">
                        {attendee.name}
                      </span>
                      {isSelf && (
                        <span className="px-1.5 py-0.2 bg-black text-white text-[8px] sm:text-[9px] font-black uppercase shrink-0">
                          YOU
                        </span>
                      )}
                      {attendeeBadges.slice(0, 2).map((badge) => {
                        const style = getRarityBadgeStyle(badge.rarity);
                        return (
                          <span
                            key={badge.id}
                            className={`flex items-center space-x-0.5 text-[8px] font-mono font-black uppercase px-1 py-0.2 border ${style.bg} ${style.text} ${style.border} shrink-0`}
                            title={`${badge.name}: ${badge.desc}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.name}</span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2 text-[9px] sm:text-[10px] text-slate-500 font-bold mt-0.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.2 uppercase border border-black shrink-0 ${
                          isOwner
                            ? 'bg-neo-yellow text-black font-black'
                            : isMemberAdmin
                            ? 'bg-amber-300 text-black font-black'
                            : 'bg-neo-mint text-black font-bold'
                        }`}
                      >
                        {isOwner ? '👑 HOST OWNER' : isMemberAdmin ? '👑 CO-ADMIN' : 'ATTENDEE'}
                      </span>
                      {lbEntry && (
                        <span className="text-black font-mono font-black bg-neo-yellow/30 px-1 border border-black text-[9px]">
                          {lbEntry.score} PTS
                        </span>
                      )}
                      <span className="shrink-0">ACTIVE NOW</span>
                    </div>
                  </div>
                </div>

                {/* Host Control Actions (Promote / Demote) */}
                {isHost && !isSelf && !isOwner && (
                  <div className="shrink-0 flex items-center justify-end">
                    {!isMemberAdmin ? (
                      <button
                        type="button"
                        onClick={() => onPromoteToAdmin && onPromoteToAdmin(attendee.session_id, attendee.name)}
                        className="w-full xs:w-auto px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Promote this attendee to Room Admin"
                      >
                        <Crown className="w-3 h-3 stroke-[2.5]" />
                        <span>MAKE ADMIN</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDemoteFromAdmin && onDemoteFromAdmin(attendee.session_id, attendee.name)}
                        className="w-full xs:w-auto px-2 py-1 bg-slate-200 hover:bg-neo-pink hover:text-white text-slate-700 text-[9px] sm:text-[10px] font-black uppercase border-2 border-black transition-all flex items-center justify-center space-x-1 cursor-pointer"
                        title="Demote from Room Admin"
                      >
                        <UserX className="w-3 h-3" />
                        <span>DEMOTE</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2.5 mt-2.5 border-t-2 border-black/20 flex flex-col xs:flex-row items-center justify-between gap-2 font-mono text-xs shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-600 font-bold flex items-center gap-1 text-center xs:text-left">
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Room Host can promote multiple admins in real-time</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full xs:w-auto px-4 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer shrink-0"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
