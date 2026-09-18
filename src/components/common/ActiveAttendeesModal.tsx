import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  User,
  Radio,
  Sparkles,
  UserX,
  RefreshCw,
  VolumeX,
  Volume2,
  AlertTriangle,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AttendeePresence, Room, LeaderboardEntry } from '../../types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ban' | 'demote' | 'reset';
    attendee: AttendeePresence;
  } | null>(null);
  const [actionToast, setActionToast] = useState<{
    message: string;
    type: 'success' | 'warn' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    if (isOpen && onRefresh) {
      onRefresh();
    }
    if (!isOpen) {
      setConfirmAction(null);
      setActionToast(null);
      setSearchQuery('');
    }
  }, [isOpen, onRefresh]);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => {
      setActionToast(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [actionToast]);

  const showToast = (message: string, type: 'success' | 'warn' | 'error' | 'info' = 'success') => {
    setActionToast({ message, type });
  };

  if (!isOpen) return null;

  // Deduplicate attendees strictly by session_id
  const uniqueAttendees = Array.from(
    new Map(
      attendees
        .filter((a) => Boolean(a && a.session_id))
        .map((a) => [a.session_id, a])
    ).values()
  );

  const isAttendeeOwner = (att: AttendeePresence) => {
    if (!room || !room.host_name) return false;
    return att.name.trim().toLowerCase() === room.host_name.trim().toLowerCase();
  };

  const isAttendeeAdmin = (att: AttendeePresence) => {
    if (isAttendeeOwner(att)) return true;
    if (room && Array.isArray(room.admins)) {
      return room.admins.some(
        (a) => typeof a === 'string' && a.trim().toLowerCase() === att.name.trim().toLowerCase()
      );
    }
    return att.role === 'host';
  };

  // Sort: Host first, then Co-Admins, then Alphabetically
  const sortedAttendees = [...uniqueAttendees].sort((a, b) => {
    const aOwner = isAttendeeOwner(a);
    const bOwner = isAttendeeOwner(b);
    if (aOwner && !bOwner) return -1;
    if (!aOwner && bOwner) return 1;

    const aAdmin = isAttendeeAdmin(a);
    const bAdmin = isAttendeeAdmin(b);
    if (aAdmin && !bAdmin) return -1;
    if (!aAdmin && bAdmin) return 1;

    return a.name.localeCompare(b.name);
  });

  const filteredAttendees = sortedAttendees.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const totalOnline = Math.max(1, sortedAttendees.length);
  const adminCount = sortedAttendees.filter(isAttendeeAdmin).length;
  const attendeeCount = Math.max(0, totalOnline - adminCount);

  // Action handlers with immediate visual and audible feedback
  const handlePromote = (attendee: AttendeePresence) => {
    playPopSound();
    onPromoteToAdmin?.(attendee.session_id, attendee.name);
    showToast(`👑 Promoted "${attendee.name}" to Room Admin`, 'success');
  };

  const handleWarn = (attendee: AttendeePresence) => {
    playPopSound();
    onSendWarning?.(attendee.session_id, attendee.name);
    showToast(`⚠️ Safeguard warning issued to "${attendee.name}"`, 'warn');
  };

  const handleMute = (attendee: AttendeePresence) => {
    playPopSound();
    onMuteAttendee?.(attendee.session_id, attendee.name);
    showToast(`🔇 Muted "${attendee.name}" from submitting Q&A`, 'warn');
  };

  const handleUnmute = (attendee: AttendeePresence) => {
    playPopSound();
    onUnmuteAttendee?.(attendee.session_id, attendee.name);
    showToast(`🔊 Q&A permissions restored for "${attendee.name}"`, 'success');
  };

  const executeConfirmAction = () => {
    if (!confirmAction) return;
    const { type, attendee } = confirmAction;

    if (type === 'ban') {
      playClickSound();
      onBanAttendee?.(attendee.session_id, attendee.name);
      showToast(`🚫 "${attendee.name}" was banned and disconnected`, 'error');
    } else if (type === 'demote') {
      playClickSound();
      onDemoteFromAdmin?.(attendee.session_id, attendee.name);
      showToast(`👤 Demoted "${attendee.name}" to Attendee`, 'info');
    } else if (type === 'reset') {
      playPopSound();
      onResetStrikes?.(attendee.session_id, attendee.name);
      showToast(`✨ Strikes reset to 0 for "${attendee.name}"`, 'success');
    }

    setConfirmAction(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0f0f13] text-white w-[95vw] sm:max-w-xl p-4 sm:p-6 rounded-2xl border border-white/[0.08] shadow-2xl relative font-sans max-h-[90dvh] flex flex-col overflow-hidden"
          >
            {/* Top In-Modal Toast Feedback */}
            <AnimatePresence>
              {actionToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-none ${
                    actionToast.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : actionToast.type === 'warn'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : actionToast.type === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {actionToast.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {actionToast.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  {actionToast.type === 'error' && <UserX className="w-3.5 h-3.5 text-rose-400" />}
                  {actionToast.type === 'info' && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{actionToast.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* In-Modal Confirmation Modal Layer */}
            <AnimatePresence>
              {confirmAction && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm rounded-2xl flex items-center justify-center p-5"
                >
                  <motion.div
                    initial={{ scale: 0.92, y: 8 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.92, y: 8 }}
                    className="bg-[#141419] border border-white/[0.12] rounded-xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4"
                  >
                    <div
                      className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center border ${
                        confirmAction.type === 'ban'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : confirmAction.type === 'demote'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                      }`}
                    >
                      {confirmAction.type === 'ban' && <UserX className="w-6 h-6" />}
                      {confirmAction.type === 'demote' && <ShieldAlert className="w-6 h-6" />}
                      {confirmAction.type === 'reset' && <RotateCcw className="w-6 h-6" />}
                    </div>

                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {confirmAction.type === 'ban' && 'Ban and Eject Attendee?'}
                        {confirmAction.type === 'demote' && 'Demote from Room Admin?'}
                        {confirmAction.type === 'reset' && 'Reset Safeguard Strikes?'}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        {confirmAction.type === 'ban' && (
                          <>
                            Are you sure you want to ban <strong className="text-white">{confirmAction.attendee.name}</strong> from Room {roomCode}? They will be immediately disconnected.
                          </>
                        )}
                        {confirmAction.type === 'demote' && (
                          <>
                            Revoke Co-Admin privileges for <strong className="text-white">{confirmAction.attendee.name}</strong>? They will return to standard attendee status.
                          </>
                        )}
                        {confirmAction.type === 'reset' && (
                          <>
                            Forgive and reset all strike counts for <strong className="text-white">{confirmAction.attendee.name}</strong> back to 0?
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setConfirmAction(null);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={executeConfirmAction}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md ${
                          confirmAction.type === 'ban'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : confirmAction.type === 'demote'
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-sky-600 hover:bg-sky-500 text-white'
                        }`}
                      >
                        {confirmAction.type === 'ban' && 'Confirm Ban'}
                        {confirmAction.type === 'demote' && 'Confirm Demote'}
                        {confirmAction.type === 'reset' && 'Reset Strikes'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer shrink-0 z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4 pr-10">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-white leading-tight font-display">
                      Active Participants
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[11px] font-medium border border-blue-500/20 uppercase shrink-0">
                      Room {roomCode}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live connected users and room moderation controls
                  </p>
                </div>
              </div>

              {onRefresh && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playPopSound();
                    onRefresh();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/[0.06] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  title="Sync live presence"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden xs:inline text-xs">Sync</span>
                </motion.button>
              )}
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-3 gap-2 mb-3 bg-[#141418] p-2.5 rounded-xl border border-white/[0.08] text-center">
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">Total Online</div>
                <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{totalOnline}</div>
              </div>
              <div className="border-x border-white/[0.08]">
                <div className="text-[10px] text-zinc-400 font-medium">Co-Admins</div>
                <div className="text-base sm:text-lg font-bold text-indigo-400 font-mono mt-0.5">{adminCount}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 font-medium">Audience</div>
                <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">{attendeeCount}</div>
              </div>
            </div>

            {/* Search Filter (if > 3 attendees) */}
            {uniqueAttendees.length > 3 && (
              <div className="mb-3 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter attendees by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-[#141418] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            )}

            {/* Attendees Roster List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-40 max-h-80 font-sans">
              {filteredAttendees.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No participants matching "{searchQuery}"
                </div>
              ) : (
                filteredAttendees.map((attendee, index) => {
                  const isMemberAdmin = isAttendeeAdmin(attendee);
                  const isOwner = isAttendeeOwner(attendee);
                  const isSelf = attendee.session_id === currentSessionId;

                  const lbEntryIndex = (leaderboard || []).findIndex(
                    (e) => e.session_id === attendee.session_id
                  );
                  const lbEntry = lbEntryIndex >= 0 ? leaderboard![lbEntryIndex] : null;
                  const strikes = strikesBySession ? strikesBySession[attendee.session_id] || 0 : 0;
                  const isMuted = Boolean(mutedSessionIds?.has(attendee.session_id));

                  return (
                    <div
                      key={attendee.session_id || index}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isOwner
                          ? 'bg-amber-500/5 border-amber-500/20 text-white'
                          : isMemberAdmin
                          ? 'bg-indigo-500/5 border-indigo-500/20 text-white'
                          : 'bg-[#141418] border-white/[0.08] text-zinc-200'
                      } ${isSelf ? 'ring-1 ring-blue-500/40' : ''}`}
                    >
                      {/* Left: Avatar & Identity Metadata */}
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Avatar Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                            isOwner
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : isMemberAdmin
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                              : 'bg-zinc-800/80 border-white/[0.08] text-zinc-400'
                          }`}
                        >
                          {isOwner ? (
                            <Crown className="w-4 h-4" />
                          ) : isMemberAdmin ? (
                            <Shield className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>

                        {/* Name + Status Tags */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm truncate max-w-36 sm:max-w-56 text-white">
                              {attendee.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                You
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1 flex-wrap">
                            {/* Role Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                isOwner
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                                  : isMemberAdmin
                                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium'
                                  : 'bg-zinc-800 text-zinc-400 border border-white/[0.06]'
                              }`}
                            >
                              {isOwner ? '👑 Host' : isMemberAdmin ? '🛡️ Co-Admin' : 'Attendee'}
                            </span>

                            {/* Strikes Counter */}
                            {strikes > 0 && (
                              <span
                                className={`px-2 py-0.5 rounded-full font-medium text-[10px] shrink-0 border ${
                                  strikes >= 3
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                ⚠️ {strikes}/3 strikes
                              </span>
                            )}

                            {/* Muted Pill */}
                            {isMuted && (
                              <span className="px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-500/20 text-rose-300 font-medium text-[10px] flex items-center gap-1 shrink-0">
                                <VolumeX className="w-2.5 h-2.5" />
                                <span>Muted</span>
                              </span>
                            )}

                            {/* Quiz Score Entry */}
                            {lbEntry && (
                              <span className="text-zinc-300 bg-[#0c0c10] px-2 py-0.5 rounded-full border border-white/[0.06] text-[10px] font-mono">
                                {lbEntry.correct_quizzes} correct
                              </span>
                            )}

                            {/* Active Dot */}
                            <span className="text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                              <span>Active</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls & Moderation Action Group */}
                      {isHost && !isSelf && !isOwner && (
                        <div className="shrink-0 flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                          {/* Role Toggle Button (Make Admin / Demote) */}
                          {!isMemberAdmin ? (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handlePromote(attendee)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-medium border border-indigo-500/30 hover:border-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Promote to Co-Admin"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Make Admin</span>
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setConfirmAction({ type: 'demote', attendee })}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium border border-white/[0.08] transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Demote from Co-Admin"
                            >
                              <UserX className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Demote</span>
                            </motion.button>
                          )}

                          {/* Moderation Toolstrip (Warn, Mute/Unmute, Reset Strikes, Ban) */}
                          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06]">
                            {/* Warn */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleWarn(attendee)}
                              className="p-1.5 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                              title="Issue safeguard warning"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </motion.button>

                            {/* Mute / Unmute */}
                            {isMuted ? (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleUnmute(attendee)}
                                className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                title="Unmute attendee Q&A"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </motion.button>
                            ) : (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleMute(attendee)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Mute attendee Q&A"
                              >
                                <VolumeX className="w-3.5 h-3.5" />
                              </motion.button>
                            )}

                            {/* Reset Strikes (only if strikes > 0) */}
                            {strikes > 0 && (
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setConfirmAction({ type: 'reset', attendee })}
                                className="p-1.5 rounded-md text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors cursor-pointer"
                                title="Reset strikes to 0"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </motion.button>
                            )}

                            {/* Ban & Eject */}
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => setConfirmAction({ type: 'ban', attendee })}
                              className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="Ban and eject from room"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-white/[0.08] flex flex-col xs:flex-row items-center justify-between gap-2.5 text-xs shrink-0">
              <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5 text-center xs:text-left">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Room Host can assign multiple Co-Admins and manage participant permissions</span>
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full xs:w-auto px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.06] bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer shrink-0 transition-colors"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
