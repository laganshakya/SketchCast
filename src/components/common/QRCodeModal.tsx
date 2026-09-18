import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playPopSound, playClickSound } from '../../lib/soundFx';

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

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${roomCode}`
    : `https://sketchcast.live/join/${roomCode}`;

  const handleCopyLink = () => {
    playPopSound();
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            className="bg-[#101014] text-[#FAFAFA] w-[92vw] max-w-xs sm:max-w-sm p-4 sm:p-6 rounded-2xl border border-white/[0.08] relative text-center max-h-[90dvh] overflow-y-auto shadow-modal"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer"
              title="Close QR Code"
            >
              <X className="w-4 h-4" />
            </motion.button>

            <div className="flex flex-col items-center mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-2.5">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Scan to Join
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-56 sm:max-w-64 mt-0.5">
                {roomTitle}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 tracking-wide">
                Instant mobile access • Zero login required
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-white/[0.1] inline-block mx-auto mb-4 shadow-md">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="bg-white/[0.02] text-white p-3.5 rounded-xl border border-white/[0.08] mb-4">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                Room Passcode
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-widest text-blue-400 font-mono">
                {roomCode}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyLink}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-center space-x-1.5 mt-3.5 text-xs text-zinc-400">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeViewerCount} live in room</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
