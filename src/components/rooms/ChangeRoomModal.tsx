import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Key, Layers, Radio, Crown, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Room } from '../../types';
import type { User } from '@supabase/supabase-js';
import { dbFetchRooms, isUserRoomAdmin } from '../../lib/supabase';
import { playClickSound, playWhoosh } from '../../lib/soundFx';

interface ChangeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchRoom: (newRoomCode: string, newRoomTitle?: string) => void;
  currentRoomCode: string;
  currentUser?: User | null;
  userName?: string;
  onOpenRoomsHub?: () => void;
}

export const ChangeRoomModal: React.FC<ChangeRoomModalProps> = ({
  isOpen,
  onClose,
  onSwitchRoom,
  currentRoomCode,
  currentUser,
  userName,
  onOpenRoomsHub,
}) => {
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    queueMicrotask(() => {
      if (!isCancelled) setIsLoadingRooms(true);
    });
    dbFetchRooms()
      .then((allRooms) => {
        if (isCancelled) return;
        const owned = allRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
        setMyRooms(owned);
      })
      .catch(() => {
        if (isCancelled) return;
        setMyRooms([]);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoadingRooms(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentUser, userName]);

  const handleClose = useCallback(() => {
    setTargetRoomCode('');
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = targetRoomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a valid Room Passcode.');
      return;
    }
    if (cleanCode === currentRoomCode.toUpperCase().trim()) {
      setErrorMessage(`You are already in Room [${cleanCode}].`);
      return;
    }
    handleClose();
    onSwitchRoom(cleanCode);
  };

  const handleSelectOwnRoom = (roomCode: string, title?: string) => {
    if (roomCode.toUpperCase().trim() === currentRoomCode.toUpperCase().trim()) {
      handleClose();
      return;
    }
    handleClose();
    onSwitchRoom(roomCode, title);
  };

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
            className="bg-[#101014] text-[#FAFAFA] w-full max-w-lg p-5 sm:p-7 rounded-2xl border border-white/[0.08] relative font-sans max-h-[90vh] flex flex-col shadow-modal"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                handleClose();
              }}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-3 mb-4 pr-8 sm:pr-10 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Switch Arena Room
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Enter any Room Passcode or instantly jump to your own rooms
                </p>
              </div>
            </div>

            {/* Current Room Tag */}
            <div className="mb-4 p-3 rounded-xl bg-white/[0.02] text-white border border-white/[0.08] flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-zinc-400 font-medium">Current Room:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono font-semibold text-xs border border-blue-500/20 tracking-wider">
                  {currentRoomCode}
                </span>
              </div>
              <span className="flex items-center space-x-1.5 text-blue-400 text-xs font-medium">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Connected</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* SECTION 1: Your Own Rooms (Host) */}
              {myRooms.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-blue-400" />
                      <span>Your Created Rooms (Host)</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {isLoadingRooms ? 'Loading...' : `${myRooms.length} ${myRooms.length === 1 ? 'Room' : 'Rooms'}`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {myRooms.map((r) => {
                      const isCurrent = r.code.toUpperCase().trim() === currentRoomCode.toUpperCase().trim();
                      return (
                        <div
                          key={r.id || r.code}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                            isCurrent ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-semibold border border-blue-500/20 tracking-wider">
                                {r.code}
                              </span>
                              <span className="text-xs font-medium text-white truncate max-w-44 sm:max-w-60">
                                {r.title}
                              </span>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-medium border border-blue-500/30 flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3" />
                              <span>Here</span>
                            </span>
                          ) : (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                playWhoosh();
                                handleSelectOwnRoom(r.code, r.title);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-sm"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Enter</span>
                              <ArrowRight className="w-3 h-3" />
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: Manual Passcode Entry */}
              <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div>
                  <label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5 text-zinc-300">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    <span>Join other Arena Room by Passcode:</span>
                  </label>
                  <input
                    type="text"
                    value={targetRoomCode}
                    onChange={(e) => {
                      setTargetRoomCode(e.target.value.toUpperCase());
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. TECH-999 or ARCH-863"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/[0.03] border border-white/[0.08] text-white font-mono font-medium focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Enter the passcode provided by another room's host to join as attendee.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/10 text-red-300 text-xs border border-red-500/20">
                    {errorMessage}
                  </div>
                )}

                <div className="flex flex-col-reverse xs:flex-row justify-between items-center gap-2 pt-2 border-t border-white/[0.08]">
                  {onOpenRoomsHub && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playClickSound();
                        handleClose();
                        onOpenRoomsHub();
                      }}
                      className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage / Create Rooms</span>
                    </motion.button>
                  )}
                  <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        playClickSound();
                        handleClose();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white cursor-pointer text-center transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => playWhoosh()}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-md shadow-blue-500/20"
                    >
                      <span>Join Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
