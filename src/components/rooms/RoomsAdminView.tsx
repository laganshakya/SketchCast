import React, { useState, useEffect } from 'react';
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
  Key
} from 'lucide-react';
import type { Room } from '../../types';
import { dbFetchRooms, dbCreateRoom, dbDeleteRoom } from '../../lib/supabase';

interface RoomsAdminViewProps {
  currentRoomCode: string;
  onSwitchRoom: (roomCode: string, roomTitle?: string) => void;
  onOpenQRCodeForRoom: (roomCode: string, roomTitle: string) => void;
  userName: string;
}

export const RoomsAdminView: React.FC<RoomsAdminViewProps> = ({
  currentRoomCode,
  onSwitchRoom,
  onOpenQRCodeForRoom,
  userName,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadRooms = async () => {
    const remoteRooms = await dbFetchRooms();
    if (remoteRooms && remoteRooms.length > 0) {
      setRooms(remoteRooms);
    } else {
      // Default fallback room if DB is empty
      setRooms([
        {
          id: 'room-SKT-789',
          code: 'SKT-789',
          title: 'Main Arena — Live Voting & Quizzing',
          host_id: 'host-root-1',
          host_name: userName || 'Host Admin',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const generateRandomCode = () => {
    const prefixes = ['SKT', 'ARENA', 'DEV', 'TECH', 'LIVE', 'CODE', 'ARCH'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setNewRoomCode(`${prefix}-${num}`);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = (newRoomCode.trim() || `SKT-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
    const cleanTitle = newRoomTitle.trim() || `Tech Arena // ${cleanCode}`;

    const newRoom: Room = {
      id: `room-${cleanCode}`,
      code: cleanCode,
      title: cleanTitle,
      host_id: `host_${Date.now()}`,
      host_name: userName || 'Host Admin',
      created_at: new Date().toISOString(),
    };

    await dbCreateRoom(newRoom);
    await loadRooms();
    onSwitchRoom(cleanCode, cleanTitle);
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

  return (
    <div className="max-w-6xl mx-auto w-full space-y-5 font-sans">
      {/* Top Header Card */}
      <div className="bg-[#151822] p-5 sm:p-6 border-2 border-black brutal-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
            <Layers className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-heavy text-white uppercase font-display tracking-tight">
                ROOMS MANAGEMENT
              </h2>
              <span className="px-2 py-0.5 bg-[#FFE600] text-black font-mono text-[10px] font-black border border-black uppercase">
                ADMIN HUB
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Create and switch between multiple live event rooms without logging out.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            generateRandomCode();
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#00F59B] hover:bg-[#26F7A9] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center space-x-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>CREATE NEW ROOM</span>
        </button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => {
          const isActive = r.code.toUpperCase() === currentRoomCode.toUpperCase();

          return (
            <div
              key={r.id || r.code}
              className={`p-5 border-2 border-black flex flex-col justify-between space-y-4 transition-all ${
                isActive
                  ? 'bg-[#1C2030] border-[#00F59B] brutal-shadow-green'
                  : 'bg-[#151822] hover:bg-[#1A1E2B] brutal-shadow-sm'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 bg-[#FFE600] text-black font-black text-xs border border-black tracking-wider">
                      {r.code}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#00F59B] text-black text-[10px] font-black border border-black uppercase">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onOpenQRCodeForRoom(r.code, r.title)}
                      className="p-1.5 bg-[#0E1017] hover:bg-black text-slate-300 hover:text-white border border-black"
                      title="Show Room QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleCopyLink(r.code, e)}
                      className="p-1.5 bg-[#0E1017] hover:bg-black text-slate-300 hover:text-white border border-black"
                      title="Copy Attendee Direct Link"
                    >
                      {copiedCode === r.code ? (
                        <Check className="w-3.5 h-3.5 text-[#00F59B]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {rooms.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(r.id, r.code, e)}
                        className="p-1.5 bg-[#0E1017] hover:bg-[#FF2A6D] text-slate-400 hover:text-white border border-black transition-colors"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-heavy text-white uppercase font-display leading-snug">
                  {r.title}
                </h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Host: <strong className="text-slate-200">{r.host_name || 'Alex Chen'}</strong>
                </p>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-black/40">
                {isActive ? (
                  <div className="w-full py-2 bg-[#00F59B]/15 text-[#00F59B] border border-[#00F59B] font-mono font-black text-xs uppercase text-center flex items-center justify-center space-x-1.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>BROADCASTING TO THIS ROOM</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onSwitchRoom(r.code, r.title)}
                    className="w-full py-2 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black font-mono font-black text-xs uppercase border-2 border-black brutal-shadow-sm transition-all flex items-center justify-center space-x-2"
                  >
                    <span>SWITCH TO THIS ROOM</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Neo-Brutalist Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FFFDF5] text-black w-full max-w-md p-6 border-4 border-black brutal-shadow-lg relative font-sans">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-[#FF2A6D] transition-colors border-2 border-black"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy">
                <Sparkles className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-heavy uppercase font-display tracking-tight text-black">
                  CREATE NEW ROOM
                </h3>
                <p className="text-xs font-mono text-slate-700">
                  Launch an isolated live session with fresh questions & polls
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5 font-mono">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black uppercase flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Room Key / Passcode</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[10px] text-slate-600 hover:text-black font-bold uppercase flex items-center gap-1 underline"
                  >
                    <RefreshCw className="w-3 h-3" /> RANDOM
                  </button>
                </div>
                <input
                  type="text"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ARCH-2026"
                  className="w-full px-3 py-2 text-sm bg-white border-2 border-black text-black font-black tracking-wider focus:outline-none focus:bg-[#FFE600]/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase block mb-1">Room Title</label>
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems Masterclass"
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-black text-black font-bold focus:outline-none focus:bg-[#FFE600]/20"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00F59B] hover:bg-[#26F7A9] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  CREATE & LAUNCH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
