import React from 'react';
import { X, Crown, User, Radio, Sparkles, UserX } from 'lucide-react';
import type { AttendeePresence } from '../../types';

interface ActiveAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: AttendeePresence[];
  currentSessionId: string;
  isHost: boolean;
  roomCode: string;
  onPromoteToAdmin?: (sessionId: string, name: string) => void;
  onDemoteFromAdmin?: (sessionId: string, name: string) => void;
}

export const ActiveAttendeesModal: React.FC<ActiveAttendeesModalProps> = ({
  isOpen,
  onClose,
  attendees,
  currentSessionId,
  isHost,
  roomCode,
  onPromoteToAdmin,
  onDemoteFromAdmin,
}) => {
  if (!isOpen) return null;

  // Deduplicate attendees by session_id or name
  const uniqueAttendees = Array.from(
    new Map(attendees.map((a) => [a.session_id || a.name, a])).values()
  );

  const totalOnline = Math.max(1, uniqueAttendees.length);
  const adminCount = uniqueAttendees.filter((a) => a.role === 'host').length;
  const attendeeCount = totalOnline - adminCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-neo-cream text-black w-full max-w-lg p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[85vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black"
          title="Close modal"
        >
          <X className="w-5 h-5 stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 bg-neo-mint text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy -rotate-2">
            <Radio className="w-6 h-6 stroke-[2.5] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-heavy uppercase tracking-tight text-black">
                ACTIVE PARTICIPANTS
              </h3>
              <span className="px-2 py-0.5 bg-black text-neo-yellow font-mono text-[10px] font-black border border-black uppercase">
                ROOM {roomCode}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-700">
              Live connected users and room admin management
            </p>
          </div>
        </div>

        {/* Counter Metric Summary Badges */}
        <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-xs">
          <div className="p-2 bg-white border-2 border-black flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">TOTAL ONLINE</span>
            <span className="text-lg font-black text-black">{totalOnline}</span>
          </div>
          <div className="p-2 bg-amber-50 border-2 border-black flex flex-col items-center justify-center">
            <span className="text-[10px] text-amber-700 font-bold uppercase">ROOM ADMINS</span>
            <span className="text-lg font-black text-amber-800">{adminCount}</span>
          </div>
          <div className="p-2 bg-emerald-50 border-2 border-black flex flex-col items-center justify-center">
            <span className="text-[10px] text-emerald-700 font-bold uppercase">ATTENDEES</span>
            <span className="text-lg font-black text-emerald-800">{attendeeCount}</span>
          </div>
        </div>

        {/* Attendees List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono">
          {uniqueAttendees.map((attendee) => {
            const isSelf = attendee.session_id === currentSessionId;
            const isMemberHost = attendee.role === 'host';

            return (
              <div
                key={attendee.session_id}
                className={`p-3 border-2 border-black transition-all flex items-center justify-between gap-3 ${
                  isMemberHost
                    ? 'bg-amber-100/70 border-black brutal-shadow-sm'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 flex items-center justify-center border-2 border-black shrink-0 font-black text-xs ${
                      isMemberHost ? 'bg-neo-yellow text-black' : 'bg-neo-cyan text-black'
                    }`}
                  >
                    {isMemberHost ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-xs font-black text-black truncate">
                        {attendee.name}
                      </span>
                      {isSelf && (
                        <span className="px-1.5 py-0.2 bg-black text-white text-[9px] font-black uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 uppercase border border-black ${
                          isMemberHost ? 'bg-neo-yellow text-black' : 'bg-neo-mint text-black'
                        }`}
                      >
                        {isMemberHost ? 'ADMIN' : 'ATTENDEE'}
                      </span>
                      <span>ACTIVE NOW</span>
                    </div>
                  </div>
                </div>

                {/* Host Control Actions (Promote / Demote) */}
                {isHost && !isSelf && (
                  <div className="shrink-0 flex items-center space-x-1.5">
                    {!isMemberHost ? (
                      <button
                        type="button"
                        onClick={() => onPromoteToAdmin && onPromoteToAdmin(attendee.session_id, attendee.name)}
                        className="px-2.5 py-1 bg-neo-yellow hover:bg-[#FFF04D] text-black text-[10px] font-black uppercase border-2 border-black brutal-shadow-sm active:translate-x-px active:translate-y-px transition-all flex items-center space-x-1"
                        title="Promote this attendee to Room Admin"
                      >
                        <Crown className="w-3 h-3 stroke-[2.5]" />
                        <span>MAKE ADMIN</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDemoteFromAdmin && onDemoteFromAdmin(attendee.session_id, attendee.name)}
                        className="px-2 py-1 bg-slate-200 hover:bg-neo-pink hover:text-white text-slate-700 text-[10px] font-black uppercase border-2 border-black transition-all flex items-center space-x-1"
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
        <div className="pt-3 mt-3 border-t-2 border-black/20 flex items-center justify-between font-mono text-xs">
          <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Room Host can promote multiple admins in real-time</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
