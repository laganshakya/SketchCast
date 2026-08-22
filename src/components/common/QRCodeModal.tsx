import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Users } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  activeViewerCount: number;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
  activeViewerCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    : `https://sketchcast.live/join/${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-[#FFFDF5] text-black w-full max-w-sm p-6 border-4 border-black brutal-shadow-lg relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-black text-white hover:bg-[#FF2A6D] transition-colors border-2 border-black"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        <div className="flex flex-col items-center mb-3">
          <div className="w-12 h-12 bg-[#FFE600] text-black border-2 border-black brutal-shadow-sm flex items-center justify-center mb-2 rotate-[-3deg]">
            <QrCode className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-heavy uppercase font-display tracking-tight text-black">
            SCAN TO JOIN
          </h3>
          <p className="text-xs font-mono font-bold text-slate-700 truncate max-w-[260px]">
            {roomTitle}
          </p>
          <p className="text-[10px] font-mono font-semibold text-slate-600 mt-0.5">
            Instant mobile access // Zero login required
          </p>
        </div>

        <div className="p-3 bg-white border-4 border-black inline-block mx-auto mb-3.5 brutal-shadow-sm">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            bgColor="#FFFFFF"
            fgColor="#000000"
            level="Q"
            includeMargin={false}
          />
        </div>

        <div className="bg-[#0E1017] text-white p-2.5 border-2 border-black mb-3.5 font-mono">
          <div className="text-[10px] font-extrabold text-[#FFE600] uppercase mb-0.5">
            ROOM PASSCODE
          </div>
          <div className="text-2xl font-black tracking-widest text-[#00F0FF]">
            {roomCode}
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full py-2.5 px-4 bg-[#FFE600] hover:bg-[#FFF04D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black text-xs font-mono font-black uppercase border-2 border-black brutal-shadow transition-all flex items-center justify-center space-x-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-black stroke-[3]" />
              <span>LINK COPIED!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span>COPY DIRECT LINK</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center space-x-2 mt-3 text-[11px] font-mono font-bold text-slate-700">
          <Users className="w-3.5 h-3.5 text-black" />
          <span>{activeViewerCount} LIVE IN ROOM</span>
        </div>
      </div>
    </div>
  );
};
