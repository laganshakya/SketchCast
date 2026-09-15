import React, { useEffect } from 'react';
import { X, Crown, User, Radio, Sparkles, UserX, RefreshCw, VolumeX, Volume2, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AttendeePresence, Room, LeaderboardEntry } from '../../types';
import { isUserRoomAdmin } from '../../lib/supabase';
import { playClickSound, playPopSound } from '../../lib/soundFx';

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
  mutedSessionIds?: Set<string>;
  strikesBySession?: Record<string, number>;
  onMuteAttendee?: (sessionId: string, name: string) => void;
  onUnmuteAttendee?: (sessionId: string, name: string) => void;
  onBanAttendee?: (sessionId: string, name: string) => void;
  onSendWarning?: (sessionId: string, name: string) => void;
  onResetStrikes?: (sessionId: string, name: string) => void;
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
  mutedSessionIds,
  strikesBySession,
  onMuteAttendee,
  onUnmuteAttendee,
  onBanAttendee,
  onSendWarning,
  onResetStrikes,
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] flex flex-col"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer shrink-0 z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    playPopSound();
                    onRefresh();
                  }}
                  className="p-1.5 bg-white hover:bg-neo-yellow text-black border-2 border-black font-mono text-xs font-black flex items-center gap-1 cursor-pointer brutal-shadow-sm transition-all shrink-0"
                  title="Refresh live participant presence"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline text-[10px]">SYNC</span>
                </motion.button>
              )}
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-3 gap-2 mb-3 bg-[#12141D] p-2 sm:p-2.5 border-2 border-black font-mono text-center">
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">TOTAL ONLINE</div>
                <div className="text-base sm:text-lg font-black text-neo-yellow">{totalOnline}</div>
              </div>
              <div className="border-x border-slate-700">
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">ADMINS</div>
                <div className="text-base sm:text-lg font-black text-neo-cyan">{adminCount}</div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">AUDIENCE</div>
                <div className="text-base sm:text-lg font-black text-neo-mint">{attendeeCount}</div>
              </div>
            </div>

            {/* Attendees Roster List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-40 max-h-80">
              {sortedAttendees.map((attendee, index) => {
                const isMemberAdmin = isAttendeeAdmin(attendee);
                const isOwner = isAttendeeOwner(attendee);
                const isSelf = attendee.session_id === currentSessionId;
                
                const lbEntryIndex = (leaderboard || []).findIndex((e) => e.session_id === attendee.session_id);
                const lbEntry = lbEntryIndex >= 0 ? leaderboard![lbEntryIndex] : null;

                return (
                  <div
                    key={attendee.session_id || index}
                    className={`p-2.5 sm:p-3 border-2 border-black flex items-center justify-between gap-2 sm:gap-3 transition-all ${
                      isOwner
                        ? 'bg-amber-100/90 text-black brutal-shadow-sm'
                        : isMemberAdmin
                        ? 'bg-cyan-50 text-black brutal-shadow-sm'
                        : 'bg-white text-black'
                    } ${isSelf ? 'ring-2 ring-black -translate-y-px' : ''}`}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
                      {/* Role Avatar Pill */}
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 border-2 border-black flex items-center justify-center font-heavy text-xs shrink-0 ${
                          isOwner
                            ? 'bg-neo-yellow text-black'
                            : isMemberAdmin
                            ? 'bg-neo-cyan text-black'
                            : 'bg-neo-mint text-black'
                        }`}
                      >
                        {isOwner || isMemberAdmin ? (
                          <Crown className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <User className="w-4 h-4 stroke-2" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                          <span className="font-heavy text-xs sm:text-sm tracking-tight truncate max-w-32 sm:max-w-48 text-black">
                            {attendee.name}
                          </span>
                          {isSelf && (
                            <span className="text-[8px] sm:text-[9px] font-mono font-black uppercase px-1.5 py-0.2 bg-black text-neo-yellow border border-black shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 sm:space-x-2 text-[9px] sm:text-[10px] text-slate-700 font-bold mt-1 flex-wrap">
                          <span
                            className={`px-1.5 py-0.2 uppercase border border-black shrink-0 ${
                              isOwner
                                ? 'bg-neo-yellow text-black font-black'
                                : isMemberAdmin
                                ? 'bg-neo-cyan text-black font-black'
                                : 'bg-neo-mint text-black font-bold'
                            }`}
                          >
                            {isOwner ? '👑 HOST OWNER' : isMemberAdmin ? '👑 CO-ADMIN' : 'ATTENDEE'}
                          </span>
                          {strikesBySession && (strikesBySession[attendee.session_id] || 0) > 0 && (
                            <span className={`px-1.5 py-0.2 uppercase border border-black font-mono font-black text-[8px] sm:text-[9px] shrink-0 ${
                              (strikesBySession[attendee.session_id] || 0) >= 3
                                ? 'bg-red-500 text-white animate-pulse'
                                : (strikesBySession[attendee.session_id] || 0) === 2
                                ? 'bg-amber-400 text-black'
                                : 'bg-neo-yellow text-black'
                            }`}>
                              STRIKE {strikesBySession[attendee.session_id]}/3
                            </span>
                          )}
                          {mutedSessionIds?.has(attendee.session_id) && (
                            <span className="px-1.5 py-0.2 uppercase border border-black bg-red-600 text-white font-mono font-black text-[8px] sm:text-[9px] flex items-center gap-0.5 shrink-0 animate-pulse">
                              <VolumeX className="w-2.5 h-2.5" />
                              <span>MUTED</span>
                            </span>
                          )}
                          {lbEntry && (
                            <span className="text-black font-mono font-black bg-neo-yellow/50 px-1.5 py-0.2 border border-black text-[9px]">
                              {lbEntry.correct_quizzes} CORRECT
                            </span>
                          )}
                          <span className="text-emerald-800 font-black flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            <span>ACTIVE NOW</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Host Control Actions (Warn / Reset / Mute / Unmute / Ban / Promote / Demote) */}
                    {isHost && !isSelf && !isOwner && (
                      <div className="shrink-0 flex items-center justify-end gap-1 sm:gap-1.5 flex-wrap">
                        {/* Send Warning Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            playPopSound();
                            onSendWarning?.(attendee.session_id, attendee.name);
                          }}
                          className="px-2 py-1 bg-amber-300 hover:bg-amber-400 text-black text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          title="Issue official safeguard warning to this attendee"
                        >
                          <AlertTriangle className="w-3 h-3 text-black" />
                          <span>WARN</span>
                        </motion.button>

                        {/* Reset Strikes Button */}
                        {strikesBySession && (strikesBySession[attendee.session_id] || 0) > 0 && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              playPopSound();
                              if (confirm(`Reset and forgive strikes for "${attendee.name}"?`)) {
                                onResetStrikes?.(attendee.session_id, attendee.name);
                              }
                            }}
                            className="px-2 py-1 bg-white hover:bg-neo-yellow text-black text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            title="Reset strikes to 0"
                          >
                            <RotateCcw className="w-3 h-3 text-black" />
                            <span>RESET</span>
                          </motion.button>
                        )}
                        {/* Mute / Unmute Button */}
                        {mutedSessionIds?.has(attendee.session_id) ? (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              playPopSound();
                              onUnmuteAttendee?.(attendee.session_id, attendee.name);
                            }}
                            className="px-2 py-1 bg-neo-mint hover:bg-[#33F3FF] text-black text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            title="Restore attendee Q&A permissions"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>UNMUTE</span>
                          </motion.button>
                        ) : (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              playPopSound();
                              onMuteAttendee?.(attendee.session_id, attendee.name);
                            }}
                            className="px-2 py-1 bg-slate-200 hover:bg-red-200 text-slate-800 text-[9px] sm:text-[10px] font-black uppercase border-2 border-black transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            title="Mute attendee Q&A submissions"
                          >
                            <VolumeX className="w-3 h-3 text-red-600" />
                            <span>MUTE</span>
                          </motion.button>
                        )}

                        {/* Ban & Kick Button */}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            playClickSound();
                            if (confirm(`Ban and eject "${attendee.name}" from Room ${roomCode}?`)) {
                              onBanAttendee?.(attendee.session_id, attendee.name);
                            }
                          }}
                          className="px-2 py-1 bg-neo-pink hover:bg-[#FF4782] text-white text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          title="Ban and kick attendee from room"
                        >
                          <UserX className="w-3 h-3" />
                          <span>BAN</span>
                        </motion.button>

                        {/* Promote / Demote */}
                        {!isMemberAdmin ? (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              playPopSound();
                              onPromoteToAdmin?.(attendee.session_id, attendee.name);
                            }}
                            className="w-full xs:w-auto px-2 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[9px] sm:text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            title="Promote this attendee to Room Admin"
                          >
                            <Crown className="w-3 h-3 stroke-[2.5]" />
                            <span className="hidden xs:inline">MAKE ADMIN</span>
                            <span className="xs:hidden">ADMIN</span>
                          </motion.button>
                        ) : (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => {
                              playClickSound();
                              onDemoteFromAdmin?.(attendee.session_id, attendee.name);
                            }}
                            className="w-full xs:w-auto px-2 py-1 bg-slate-200 hover:bg-neo-pink hover:text-white text-slate-700 text-[9px] sm:text-[10px] font-black uppercase border-2 border-black transition-all flex items-center justify-center space-x-1 cursor-pointer"
                            title="Demote from Room Admin"
                          >
                            <UserX className="w-3 h-3" />
                            <span>DEMOTE</span>
                          </motion.button>
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
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full xs:w-auto px-4 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer shrink-0"
              >
                CLOSE
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
