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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-sm font-sans"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-paper text-ink w-[92vw] max-w-xs sm:max-w-sm p-5 sm:p-7 rounded-3xl border border-hairline relative text-center max-h-[90dvh] overflow-y-auto shadow-2xl"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl bg-paper-surface hover:bg-paper text-muted hover:text-ink border border-hairline transition-colors cursor-pointer shadow-xs"
              title="Close QR Code"
            >
              <X className="w-4 h-4" />
            </motion.button>

            <div className="flex flex-col items-center mb-4">
              <div className="w-11 h-11 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center mb-2.5 shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
                Scan to Join
              </h3>
              <p className="text-xs text-muted truncate max-w-56 sm:max-w-64 mt-0.5">
                {roomTitle}
              </p>
              <p className="text-[11px] text-muted/80 mt-1 font-mono tracking-wide">
                Instant mobile access • Zero login required
              </p>
            </div>

            <div className="p-4 bg-paper-surface rounded-2xl border border-hairline inline-block mx-auto mb-4 shadow-sm">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#101313"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="bg-paper-surface p-3.5 rounded-2xl border border-hairline mb-4 shadow-xs">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1 font-mono">
                Room Passcode
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-widest text-ink font-mono">
                {roomCode}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyLink}
              className="btn-noma-orange w-full py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
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

            <div className="flex items-center justify-center space-x-1.5 mt-3.5 text-xs text-muted font-mono">
              <Users className="w-3.5 h-3.5 text-orange" />
              <span>{activeViewerCount} live in room</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
