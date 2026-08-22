import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Key, Layers, Radio } from 'lucide-react';

interface ChangeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchRoom: (newRoomCode: string, newRoomTitle?: string) => void;
  currentRoomCode: string;
}

export const ChangeRoomModal: React.FC<ChangeRoomModalProps> = ({
  isOpen,
  onClose,
  onSwitchRoom,
  currentRoomCode,
}) => {
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetRoomCode('');
      setErrorMessage(null);
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-md p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neo-cyan text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
              SWITCH ARENA ROOM
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
              Enter the Room Passcode to switch arena session
            </p>
          </div>
        </div>

        {/* Current Room Tag */}
        <div className="mb-3.5 sm:mb-4 p-2 sm:p-2.5 bg-neo-card text-white border-2 border-black font-mono flex items-center justify-between flex-wrap gap-1.5">
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

        {/* Manual Enter Form */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono">
          <div>
            <label className="text-xs font-black uppercase flex items-center gap-1 mb-1">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>ENTER ROOM PASSCODE / KEY:</span>
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
              autoFocus
            />
            <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold mt-1">
              A passcode provided by the session host or host's QR code is required.
            </p>
          </div>

          {errorMessage && (
            <div className="p-2 bg-neo-pink text-white font-bold text-xs border border-black">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1.5 sm:pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full xs:w-auto px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-slate-200 hover:bg-slate-300 text-black cursor-pointer text-center"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="w-full xs:w-auto px-5 py-2 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>JOIN ROOM</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
