import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Key, Layers, Radio, Crown, Plus, Check } from 'lucide-react';
import type { Room } from '../../types';
import type { User } from '@supabase/supabase-js';
import { dbFetchRooms, isUserRoomAdmin } from '../../lib/supabase';

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

  const loadMyRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const allRooms = await dbFetchRooms();
      const owned = allRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
      setMyRooms(owned);
    } catch {
      setMyRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser, userName]);

  useEffect(() => {
    if (isOpen) {
      setTargetRoomCode('');
      setErrorMessage(null);
      loadMyRooms();
    }
  }, [isOpen, loadMyRooms]);

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
    onSwitchRoom(cleanCode);
    onClose();
  };

  const handleSelectOwnRoom = (roomCode: string, title?: string) => {
    if (roomCode.toUpperCase().trim() === currentRoomCode.toUpperCase().trim()) {
      onClose();
      return;
    }
    onSwitchRoom(roomCode, title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-lg p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10 shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
              SWITCH ARENA ROOM
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
              Enter any Room Passcode or instantly jump to your own rooms
            </p>
          </div>
        </div>

        {/* Current Room Tag */}
        <div className="mb-3.5 p-2 sm:p-2.5 bg-neo-card text-white border-2 border-black font-mono flex items-center justify-between flex-wrap gap-1.5 shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">CURRENT ROOM:</span>
            <span className="px-1.5 sm:px-2 py-0.2 bg-neo-yellow text-black font-black text-xs border border-black">
              {currentRoomCode}
            </span>
          </div>
          <span className="flex items-center space-x-1 text-neo-mint text-[10px] sm:text-[11px] font-bold">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>CONNECTED</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono">
          {/* SECTION 1: Your Own Rooms (Host) */}
          {myRooms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-black flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>YOUR CREATED ROOMS (HOST)</span>
                </span>
                <span className="text-[10px] text-slate-600 font-bold">
                  {isLoadingRooms ? 'Loading...' : `${myRooms.length} ${myRooms.length === 1 ? 'Room' : 'Rooms'}`}
                </span>
              </div>

              <div className="space-y-1.5">
                {myRooms.map((r) => {
                  const isCurrent = r.code.toUpperCase().trim() === currentRoomCode.toUpperCase().trim();
                  return (
                    <div
                      key={r.id || r.code}
                      className={`p-2.5 border-2 border-black flex items-center justify-between gap-2 transition-all ${
                        isCurrent ? 'bg-amber-100 border-black' : 'bg-white hover:bg-amber-50/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="px-1.5 py-0.2 bg-neo-yellow text-black text-[10px] font-black border border-black">
                            {r.code}
                          </span>
                          <span className="text-xs font-bold text-black truncate max-w-44 sm:max-w-60">
                            {r.title}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="px-2 py-1 bg-black text-neo-mint text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          <span>HERE</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectOwnRoom(r.code, r.title)}
                          className="px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          <Crown className="w-3 h-3 text-black" />
                          <span>ENTER HOST</span>
                          <ArrowRight className="w-3 h-3 stroke-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: Manual Passcode Entry */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t-2 border-black/15">
            <div>
              <label className="text-xs font-black uppercase flex items-center gap-1 mb-1">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>JOIN OTHER ARENA ROOM BY PASSCODE:</span>
              </label>
              <input
                type="text"
                value={targetRoomCode}
                onChange={(e) => {
                  setTargetRoomCode(e.target.value.toUpperCase());
                  setErrorMessage(null);
                }}
                placeholder="e.g. TECH-999 or ARCH-863"
                className="w-full px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border-2 border-black text-black font-black tracking-wider focus:outline-none focus:bg-neo-yellow/20"
              />
              <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold mt-1">
                Enter the passcode provided by another room's host to join as attendee.
              </p>
            </div>

            {errorMessage && (
              <div className="p-2 bg-neo-pink text-white font-bold text-xs border border-black">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col-reverse xs:flex-row justify-between items-center gap-2 pt-1">
              {onOpenRoomsHub && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRoomsHub();
                  }}
                  className="text-[11px] font-bold text-slate-700 hover:text-black underline uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Manage / Create Rooms</span>
                </button>
              )}
              <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neo-cyan hover:bg-[#38F2FF] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>JOIN ROOM</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-3" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
