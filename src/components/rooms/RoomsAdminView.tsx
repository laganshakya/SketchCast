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
  FileText
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
}

export const RoomsAdminView: React.FC<RoomsAdminViewProps> = ({
  currentRoomCode,
  onSwitchRoom,
  onOpenQRCodeForRoom,
  onOpenAISummary,
  onOpenAISettings,
  userName,
  currentUser,
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
    loadRooms();
  }, [loadRooms]);

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

    const cleanTitle = newRoomTitle.trim() || `Tech Arena // ${finalCode}`;
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
    <div className="max-w-6xl mx-auto w-full space-y-5 font-sans pb-24 sm:pb-28 md:pb-6">
      {/* Top Header Card */}
      <div className="bg-neo-card p-5 sm:p-6 border-2 border-black brutal-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
            <Layers className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-heavy text-white uppercase tracking-tight">
                ROOMS & ADMINS MANAGEMENT
              </h2>
              <span className="px-2 py-0.5 bg-neo-yellow text-black font-mono text-[10px] font-black border border-black uppercase">
                ADMIN HUB
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Create rooms, switch active sessions, and assign multiple co-admins per room.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {onOpenAISettings && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onOpenAISettings();
              }}
              className="px-3.5 py-2.5 bg-neo-pink hover:bg-[#FF4782] text-white text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>AI SETTINGS</span>
            </motion.button>
          )}

          {onOpenAISummary && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClickSound();
                onOpenAISummary();
              }}
              className="px-3.5 py-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>AI SUMMARY REPORT</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              handleOpenCreateModal();
            }}
            className="px-4 py-2.5 bg-neo-mint hover:bg-[#26F7A9] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span>CREATE NEW ROOM</span>
          </motion.button>
        </div>
      </div>

      {/* Rooms Grid / Empty State */}
      {rooms.length === 0 ? (
        <div className="bg-neo-card p-8 border-2 border-black brutal-shadow text-center space-y-3">
          <Sparkles className="w-8 h-8 text-neo-yellow mx-auto" />
          <h3 className="text-lg font-heavy uppercase text-white">
            NO PRIVATE ROOMS ACCESSIBLE
          </h3>
          <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
            You currently do not own or co-manage any rooms. Create a private arena session or have another host add you as a co-admin.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playClickSound();
              handleOpenCreateModal();
            }}
            className="mt-2 px-5 py-2.5 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-3" />
            <span>CREATE FIRST ROOM</span>
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
                className={`p-5 border-2 border-black flex flex-col justify-between space-y-4 transition-all ${
                  isActive
                    ? 'bg-[#1C2030] border-neo-mint brutal-shadow-green'
                    : 'bg-neo-card hover:bg-[#1A1E2B] brutal-shadow-sm'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Header Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="px-2.5 py-1 bg-neo-yellow text-black font-black text-xs border border-black tracking-wider">
                        {r.code}
                      </span>
                      {isOwner ? (
                        <span className="px-1.5 py-0.5 bg-neo-yellow text-black font-mono text-[9px] font-black uppercase border border-black flex items-center gap-0.5 brutal-shadow-sm">
                          <Crown className="w-2.5 h-2.5 fill-black" />
                          <span>OWNER</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-neo-cyan text-black font-mono text-[9px] font-black uppercase border border-black flex items-center gap-0.5 brutal-shadow-sm">
                          <Shield className="w-2.5 h-2.5" />
                          <span>CO-ADMIN</span>
                        </span>
                      )}
                      {isActive && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-neo-mint text-black text-[10px] font-black border border-black uppercase">
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          playClickSound();
                          onOpenQRCodeForRoom(r.code, r.title);
                        }}
                        className="p-1.5 bg-neo-card-darker hover:bg-black text-slate-300 hover:text-white border border-black cursor-pointer"
                        title="Show Room QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          playPopSound();
                          handleCopyLink(r.code, e);
                        }}
                        className="p-1.5 bg-neo-card-darker hover:bg-black text-slate-300 hover:text-white border border-black cursor-pointer"
                        title="Copy Attendee Direct Link"
                      >
                        {copiedCode === r.code ? (
                          <Check className="w-3.5 h-3.5 text-neo-mint" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                      {rooms.length > 1 && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            playClickSound();
                            handleDelete(r.id, r.code, e);
                          }}
                          className="p-1.5 bg-neo-card-darker hover:bg-neo-pink text-slate-400 hover:text-white border border-black transition-colors cursor-pointer"
                          title="Delete Room"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-heavy text-white uppercase leading-snug">
                    {r.title}
                  </h3>
                  
                  <p className="text-[11px] font-mono text-slate-400">
                    Primary Host: <strong className="text-slate-200">{r.host_name || 'Host'}</strong>
                  </p>

                  {/* Co-Admins Management Strip */}
                  <div className="p-2.5 bg-[#12141D] border border-slate-800 font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-neo-yellow flex items-center gap-1 uppercase font-black">
                        <Crown className="w-3 h-3 text-neo-yellow" />
                        <span>CO-ADMINS ({adminList.length})</span>
                      </span>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          playClickSound();
                          setEditingAdminsRoom(r);
                        }}
                        className="text-[10px] bg-slate-800 hover:bg-neo-yellow hover:text-black text-slate-300 px-1.5 py-0.5 border border-slate-700 font-black uppercase transition-colors flex items-center gap-0.5 cursor-pointer"
                      >
                        <UserPlus className="w-2.5 h-2.5" />
                        <span>+ ADD</span>
                      </motion.button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {adminList.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">No additional admins assigned</span>
                      ) : (
                        adminList.map((adm) => (
                          <span
                            key={adm}
                            className="px-1.5 py-0.2 bg-[#1A1E2B] text-slate-200 text-[10px] border border-slate-700 font-bold flex items-center gap-1"
                          >
                            <span>{adm}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="pt-2 border-t border-black/40">
                  {isActive ? (
                    <div className="w-full py-2 bg-neo-mint/15 text-neo-mint border border-neo-mint font-mono font-black text-xs uppercase text-center flex items-center justify-center space-x-1.5">
                      <Check className="w-4 h-4 stroke-3" />
                      <span>BROADCASTING TO THIS ROOM</span>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        playWhoosh();
                        onSwitchRoom(r.code, r.title);
                      }}
                      className="w-full py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black font-mono font-black text-xs uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>SWITCH TO THIS ROOM</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-3" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Neo-Brutalist Create Room Modal */}
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
              className="bg-neo-cream text-black w-full max-w-md p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playClickSound();
                  setIsCreateModalOpen(false);
                }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
              </motion.button>

              <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    CREATE NEW ROOM
                  </h3>
                  <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                    Unique room passcode is auto-generated to prevent overwriting existing rooms
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3 font-mono">
                {/* Auto-Assigned Locked Room Key Field */}
                <div className="p-2.5 sm:p-3 bg-amber-50 border-2 border-black">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="text-[11px] sm:text-xs font-black uppercase flex items-center gap-1.5 text-black">
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      <span>AUTO-ASSIGNED ROOM KEY:</span>
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playClickSound();
                        setNewRoomCode(generateUniqueCode(rooms));
                      }}
                      className="text-[9px] sm:text-[10px] bg-black text-white hover:bg-neo-pink px-2 py-0.5 font-black uppercase flex items-center gap-1 border border-black transition-colors cursor-pointer"
                      title="Generate another unique room code"
                    >
                      <RefreshCw className="w-3 h-3" /> SHUFFLE
                    </motion.button>
                  </div>

                  <div className="flex items-center bg-white border-2 border-black px-2.5 sm:px-3 py-1.5 sm:py-2">
                    <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <span className="text-sm sm:text-base font-black tracking-widest text-black flex-1 select-all">
                      {newRoomCode}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 bg-neo-mint text-black border border-black shrink-0">
                      UNIQUE
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold mt-1">
                    This passcode is auto-generated so your new room never conflicts with any active session.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase block mb-1">Room Title</label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Masterclass"
                    className="w-full px-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20"
                    required
                  />
                </div>

                <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      playClickSound();
                      setIsCreateModalOpen(false);
                    }}
                    className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                  >
                    CANCEL
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => playWhoosh()}
                    className="w-full xs:w-auto px-5 py-2 bg-neo-mint hover:bg-[#26F7A9] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow cursor-pointer flex items-center justify-center"
                  >
                    CREATE & LAUNCH
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
              className="bg-neo-cream text-black w-full max-w-md p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playClickSound();
                  setEditingAdminsRoom(null);
                }}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
              </motion.button>

              <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
                <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    MANAGE ROOM ADMINS
                  </h3>
                  <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5 truncate max-w-xs">
                    Room: <strong>[{editingAdminsRoom.code}] {editingAdminsRoom.title}</strong>
                  </p>
                </div>
              </div>

              {/* Add Admin Form */}
              <form onSubmit={handleAddCoAdmin} className="space-y-3 mb-3.5 font-mono">
                <div>
                  <label className="text-xs font-black uppercase block mb-1">
                    Add Co-Admin (Display Name or Email):
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newAdminInput}
                      onChange={(e) => setNewAdminInput(e.target.value)}
                      placeholder="e.g. Alex_CoHost or sarah@company.com"
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-neo-yellow/20"
                      required
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => playClickSound()}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-neo-mint hover:bg-[#26F7A9] text-black text-xs font-black uppercase border-2 border-black brutal-shadow-sm flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-3" />
                      <span>ADD</span>
                    </motion.button>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold mt-1">
                    Users matching this name/email automatically receive full Host powers in this room.
                  </p>
                </div>
              </form>

              {/* Current Co-Admins List */}
              <div className="space-y-2 font-mono">
                <label className="text-[11px] sm:text-xs font-black uppercase block text-slate-800">
                  CURRENT AUTHORIZED ADMINS ({editingAdminsRoom.admins?.length || 0}):
                </label>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {(editingAdminsRoom.admins || []).length === 0 ? (
                    <div className="p-2.5 bg-white border-2 border-black text-center text-[11px] sm:text-xs text-slate-500 italic">
                      No co-admins added yet. Add one above or promote live attendees in-session.
                    </div>
                  ) : (
                    (editingAdminsRoom.admins || []).map((adminName) => (
                      <div
                        key={adminName}
                        className="p-2 sm:p-2.5 bg-white border-2 border-black flex items-center justify-between gap-2 text-xs font-bold"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate text-black font-black text-[11px] sm:text-xs">{adminName}</span>
                        </div>

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            playClickSound();
                            handleRemoveCoAdmin(adminName);
                          }}
                          className="p-1 text-slate-500 hover:text-neo-pink hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                          title="Remove co-admin"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t-2 border-black/20 flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playClickSound();
                    setEditingAdminsRoom(null);
                  }}
                  className="w-full xs:w-auto px-5 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow cursor-pointer text-center"
                >
                  DONE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
