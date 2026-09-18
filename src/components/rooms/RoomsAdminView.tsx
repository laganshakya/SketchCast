import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  Trash2,
  Radio,
  Sparkles,
  X,
  RefreshCw,
  Key,
  Lock,
  Crown,
  UserPlus,
  UserX,
  Shield,
  Bot,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Room } from '../../types';
import type { User } from '@supabase/supabase-js';
import { dbFetchRooms, dbCreateRoom, dbDeleteRoom, dbUpdateRoomAdmins, isUserRoomAdmin } from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface RoomsAdminViewProps {
  currentRoomCode: string;
  onSwitchRoom: (roomCode: string, roomTitle?: string) => void;
  onOpenQRCodeForRoom: (roomCode: string, roomTitle: string) => void;
  onOpenAISummary?: () => void;
  onOpenAISettings?: () => void;
  userName: string;
  currentUser?: User | null;
  isHost?: boolean;
  hasGeneratedReport?: boolean;
}

export const RoomsAdminView: React.FC<RoomsAdminViewProps> = ({
  currentRoomCode,
  onSwitchRoom,
  onOpenQRCodeForRoom,
  onOpenAISummary,
  onOpenAISettings,
  userName,
  currentUser,
  isHost = false,
  hasGeneratedReport = false,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Manage Admins Modal State
  const [editingAdminsRoom, setEditingAdminsRoom] = useState<Room | null>(null);
  const [newAdminInput, setNewAdminInput] = useState('');

  const loadRooms = useCallback(async () => {
    const remoteRooms = await dbFetchRooms();
    if (remoteRooms && remoteRooms.length > 0) {
      // Strictly filter to ONLY rooms owned by or co-managed by this host
      const myRooms = remoteRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
      setRooms(myRooms);
    } else {
      setRooms([]);
    }
  }, [currentUser, userName]);

  useEffect(() => {
    let isMounted = true;
    dbFetchRooms().then((remoteRooms) => {
      if (!isMounted) return;
      if (remoteRooms && remoteRooms.length > 0) {
        const myRooms = remoteRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
        setRooms(myRooms);
      } else {
        setRooms([]);
      }
    }).catch(() => {
      if (isMounted) setRooms([]);
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser, userName]);

  const generateUniqueCode = (existingRoomsList: Room[] = rooms): string => {
    const prefixes = ['SKT', 'ARENA', 'DEV', 'TECH', 'ARCH', 'CYBER', 'NODE', 'FLOW', 'VOTE', 'PULSE', 'STAGE', 'LAB'];
    const existingCodes = new Set(existingRoomsList.map((r) => r.code.toUpperCase().trim()));

    for (let i = 0; i < 100; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}-${num}`;
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }
    return `SKT-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  };

  const handleOpenCreateModal = () => {
    const freshCode = generateUniqueCode(rooms);
    setNewRoomCode(freshCode);
    setNewRoomTitle('');
    setIsCreateModalOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fetch latest rooms to guarantee zero collision across all global rooms
    const remoteRooms = await dbFetchRooms();
    let finalCode = newRoomCode.trim().toUpperCase();
    if (!finalCode || (remoteRooms && remoteRooms.some(r => r.code.toUpperCase() === finalCode))) {
      finalCode = generateUniqueCode(remoteRooms || rooms);
    }

    const cleanTitle = newRoomTitle.trim() || `Tech Arena • ${finalCode}`;
    const hostEmail = currentUser?.email || undefined;
    const hostId = currentUser?.id || `host_${Date.now()}`;

    const newRoom: Room = {
      id: `room-${finalCode}`,
      code: finalCode,
      title: cleanTitle,
      host_id: hostId,
      host_name: userName || 'Host Admin',
      host_email: hostEmail,
      admins: hostEmail ? [hostEmail, userName] : [userName],
      created_at: new Date().toISOString(),
    };

    await dbCreateRoom(newRoom);
    await loadRooms();
    onSwitchRoom(finalCode, cleanTitle);
    setIsCreateModalOpen(false);
    setNewRoomCode('');
    setNewRoomTitle('');
  };

  const handleDelete = async (roomId: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete Room [${code}]? All questions, polls and quiz history for this room will be cleared.`)) {
      await dbDeleteRoom(roomId, code);
      await loadRooms();
    }
  };

  const handleCopyLink = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?room=${code}`
      : `https://sketchcast.live/?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Add a co-admin to a room
  const handleAddCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminsRoom || !newAdminInput.trim()) return;

    const adminToAdd = newAdminInput.trim();
    const currentAdmins = editingAdminsRoom.admins || [];
    if (currentAdmins.some((a) => a.toLowerCase() === adminToAdd.toLowerCase())) {
      setNewAdminInput('');
      return;
    }

    const updatedAdmins = [...currentAdmins, adminToAdd];
    await dbUpdateRoomAdmins(editingAdminsRoom.code, updatedAdmins);
    
    setEditingAdminsRoom((prev) => (prev ? { ...prev, admins: updatedAdmins } : null));
    setRooms((prev) =>
      prev.map((r) => (r.code === editingAdminsRoom.code ? { ...r, admins: updatedAdmins } : r))
    );
    setNewAdminInput('');
  };

  // Remove a co-admin from a room
  const handleRemoveCoAdmin = async (adminToRemove: string) => {
    if (!editingAdminsRoom) return;

    const currentAdmins = editingAdminsRoom.admins || [];
    const updatedAdmins = currentAdmins.filter((a) => a.toLowerCase() !== adminToRemove.toLowerCase());
    await dbUpdateRoomAdmins(editingAdminsRoom.code, updatedAdmins);

    setEditingAdminsRoom((prev) => (prev ? { ...prev, admins: updatedAdmins } : null));
    setRooms((prev) =>
      prev.map((r) => (r.code === editingAdminsRoom.code ? { ...r, admins: updatedAdmins } : r))
    );
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 font-sans p-2.5 sm:p-4 md:p-6">
      {/* Top Header Card */}
      <div className="bg-[#101014] p-5 sm:p-6 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Rooms & Admins Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold tracking-wide border border-blue-500/20">
                Admin Hub
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Create rooms, switch active sessions, and assign multiple co-admins per room.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* AI Settings: Host / Admin only */}
          {isHost && onOpenAISettings && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onOpenAISettings();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>AI Settings</span>
            </motion.button>
          )}

          {/* AI Summary Report */}
          {onOpenAISummary && (isHost || hasGeneratedReport) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onOpenAISummary();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>{isHost ? 'AI Summary Report' : 'View AI Report'}</span>
              {!isHost && hasGeneratedReport && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-semibold ml-1">
                  Ready
                </span>
              )}
            </motion.button>
          )}

          {isHost && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                handleOpenCreateModal();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-2 shrink-0 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Room</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Rooms Grid / Empty State */}
      {rooms.length === 0 ? (
        <div className="bg-[#101014] p-8 rounded-2xl border border-white/[0.08] text-center space-y-3">
          <Sparkles className="w-8 h-8 text-blue-400 mx-auto" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            No Private Rooms Accessible
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            You currently do not own or co-manage any rooms. Create a private arena session or have another host add you as a co-admin.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              handleOpenCreateModal();
            }}
            className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Room</span>
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r, index) => {
            const isActive = r.code.toUpperCase() === currentRoomCode.toUpperCase();
            const adminList = r.admins || [];
            const isOwner =
              Boolean(currentUser?.id && r.host_id === currentUser.id) ||
              Boolean(currentUser?.email && r.host_email && r.host_email.toLowerCase() === currentUser.email.toLowerCase()) ||
              Boolean(r.host_name && r.host_name.toLowerCase() === userName.toLowerCase());

            return (
              <motion.div
                key={r.id || r.code}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                whileHover={{ y: -2 }}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                  isActive
                    ? 'bg-blue-500/5 border-blue-500/30 shadow-sm'
                    : 'bg-[#101014] border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                <div className="space-y-3">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-semibold text-xs tracking-wider">
                        {r.code}
                      </span>
                      {isOwner ? (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 text-[10px] font-medium border border-white/[0.08] flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-blue-400" />
                          <span>Owner</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 text-[10px] font-medium border border-white/[0.08] flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-blue-400" />
                          <span>Co-Admin</span>
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-medium border border-blue-500/30">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          playClickSound();
                          onOpenQRCodeForRoom(r.code, r.title);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                        title="Show Room QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          playPopSound();
                          handleCopyLink(r.code, e);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] cursor-pointer transition-colors"
                        title="Copy Attendee Direct Link"
                      >
                        {copiedCode === r.code ? (
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                      {rooms.length > 1 && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            playClickSound();
                            handleDelete(r.id, r.code, e);
                          }}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-colors cursor-pointer"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                    {r.title}
                  </h3>
                  
                  <p className="text-xs text-zinc-400">
                    Primary Host: <strong className="text-zinc-200">{r.host_name || 'Host'}</strong>
                  </p>

                  {/* Co-Admins Management Strip */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="text-blue-400 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-blue-400" />
                        <span>Co-Admins ({adminList.length})</span>
                      </span>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          playClickSound();
                          setEditingAdminsRoom(r);
                        }}
                        className="text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white px-2 py-0.5 rounded-lg border border-white/[0.08] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-2.5 h-2.5" />
                        <span>+ Add</span>
                      </motion.button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                      {adminList.length === 0 ? (
                        <span className="text-[11px] text-zinc-500 italic">No additional admins assigned</span>
                      ) : (
                        adminList.map((adm) => (
                          <span
                            key={adm}
                            className="px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 text-[10px] border border-white/[0.08] flex items-center gap-1"
                          >
                            <span>{adm}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="pt-2.5 border-t border-white/[0.08]">
                  {isActive ? (
                    <div className="w-full py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center space-x-1.5">
                      <Check className="w-4 h-4" />
                      <span>Broadcasting to this Room</span>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playWhoosh();
                        onSwitchRoom(r.code, r.title);
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
                    >
                      <span>Switch to this Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
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
              className="bg-[#101014] text-[#FAFAFA] w-[95vw] sm:max-w-md p-4 sm:p-7 rounded-2xl border border-white/[0.08] relative font-sans max-h-[90dvh] overflow-y-auto shadow-modal"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playClickSound();
                  setIsCreateModalOpen(false);
                }}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </motion.button>

              <div className="flex items-start space-x-3 mb-4 pr-8 sm:pr-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                    Create New Room
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Unique room passcode is auto-generated to prevent overwriting existing rooms
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                {/* Auto-Assigned Locked Room Key Field */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-300">
                      <Key className="w-3.5 h-3.5 text-blue-400" />
                      <span>Auto-Assigned Room Key:</span>
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playClickSound();
                        setNewRoomCode(generateUniqueCode(rooms));
                      }}
                      className="text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 border border-blue-500/20 transition-colors cursor-pointer"
                      title="Generate another unique room code"
                    >
                      <RefreshCw className="w-3 h-3" /> Shuffle
                    </motion.button>
                  </div>

                  <div className="flex items-center rounded-xl bg-black/40 border border-white/[0.08] px-3.5 py-2.5">
                    <Lock className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                    <span className="text-base font-bold tracking-widest text-blue-400 flex-1 select-all font-mono">
                      {newRoomCode}
                    </span>
                    <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      Unique
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    This passcode is auto-generated so your new room never conflicts with any active session.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1 text-zinc-300">Room Title</label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Masterclass"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white/[0.03] border border-white/[0.08] text-white font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playClickSound();
                      setIsCreateModalOpen(false);
                    }}
                    className="w-full xs:w-auto px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white cursor-pointer text-center transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => playWhoosh()}
                    className="w-full xs:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center transition-all shadow-md shadow-blue-500/20"
                  >
                    Create & Launch
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Co-Admins Modal */}
      <AnimatePresence>
        {editingAdminsRoom && (
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
              className="bg-[#101014] text-[#FAFAFA] w-[95vw] sm:max-w-md p-4 sm:p-7 rounded-2xl border border-white/[0.08] relative font-sans max-h-[90dvh] overflow-y-auto shadow-modal"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playClickSound();
                  setEditingAdminsRoom(null);
                }}
                className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </motion.button>

              <div className="flex items-start space-x-3 mb-4 pr-8 sm:pr-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                    Manage Room Admins
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 truncate max-w-xs">
                    Room: <strong>[{editingAdminsRoom.code}] {editingAdminsRoom.title}</strong>
                  </p>
                </div>
              </div>

              {/* Add Admin Form */}
              <form onSubmit={handleAddCoAdmin} className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold block mb-1 text-zinc-300">
                    Add Co-Admin (Display Name or Email):
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newAdminInput}
                      onChange={(e) => setNewAdminInput(e.target.value)}
                      placeholder="e.g. Alex_CoHost or sarah@company.com"
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white/[0.03] border border-white/[0.08] text-white font-medium focus:outline-none focus:border-blue-500"
                      required
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => playClickSound()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1 shrink-0 cursor-pointer transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </motion.button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Users matching this name/email automatically receive full Host powers in this room.
                  </p>
                </div>
              </form>

              {/* Current Co-Admins List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold block text-zinc-300">
                  Current Authorized Admins ({editingAdminsRoom.admins?.length || 0}):
                </label>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(editingAdminsRoom.admins || []).length === 0 ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-center text-xs text-zinc-500 italic">
                      No co-admins added yet. Add one above or promote live attendees in-session.
                    </div>
                  ) : (
                    (editingAdminsRoom.admins || []).map((adminName) => (
                      <div
                        key={adminName}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Crown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="truncate text-zinc-200 font-medium text-xs">{adminName}</span>
                        </div>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            playClickSound();
                            handleRemoveCoAdmin(adminName);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Remove co-admin"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-white/[0.08] flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClickSound();
                    setEditingAdminsRoom(null);
                  }}
                  className="w-full xs:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer text-center transition-all shadow-md shadow-blue-500/20"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
