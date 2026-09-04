import React, { useEffect, useState, useRef } from 'react';
import { X, Award, Share2, Check, ExternalLink, Sparkles, Trophy, ShieldCheck, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import type { AchievementBadge } from '../../types';
import { playCertificateFanfare, playClickSound, playPopSound } from '../../lib/soundFx';
import { getRarityBadgeStyle } from '../../lib/badgeSystem';

interface MasterclassCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  roomTitle: string;
  roomCode: string;
  score: number;
  rank?: number;
  totalAttendees?: number;
  badges?: AchievementBadge[];
}

export const MasterclassCertificateModal: React.FC<MasterclassCertificateModalProps> = ({
  isOpen,
  onClose,
  recipientName,
  roomTitle,
  roomCode,
  score,
  rank = 1,
  totalAttendees = 12,
  badges = [],
}) => {
  const [copied, setCopied] = useState(false);
  const certCardRef = useRef<HTMLDivElement>(null);

  // Deterministic Certificate ID based on recipient & room
  const certId = `CERT-SC-${roomCode.toUpperCase()}-${Math.abs(
    (recipientName + roomCode).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 997
  ).toString(36).toUpperCase()}`;

  const issueDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&score=${score}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}`
    : `https://sketchcast.live/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&score=${score}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}`;

  // Launch celebration fanfare and confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      playCertificateFanfare();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#FFE600', '#00F59B', '#FF4782', '#33F3FF', '#FFFFFF'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    playPopSound();
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareLinkedIn = () => {
    playClickSound();
    const text = encodeURIComponent(
      `🎓 Proud to complete the "${roomTitle}" live technical masterclass on SketchCast!\nScored ${score} PTS (Rank #${rank}) and earned verifiable achievement badges.\nVerify credential: ${verificationUrl}`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    playClickSound();
    const text = encodeURIComponent(
      `Just mastered the live architecture challenges in "${roomTitle}" on @SketchCast! ⚡ Scored ${score} PTS (Rank #${rank}). Check my verifiable pass: ${verificationUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto font-sans"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="w-full max-w-2xl bg-[#0D0F17] border-4 border-black brutal-shadow-lg text-white my-auto overflow-hidden flex flex-col"
          >
            {/* Modal Header Bar */}
            <div className="p-3 sm:p-4 bg-neo-yellow text-black border-b-4 border-black flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black text-neo-yellow border-2 border-black flex items-center justify-center font-black">
                  <Award className="w-5 h-5 fill-neo-yellow" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-base font-heavy uppercase tracking-tight leading-none">
                    OFFICIAL MASTERCLASS COMPLETION PASS
                  </h2>
                  <span className="text-[10px] font-mono font-bold tracking-wider">
                    VERIFIABLE CREDENTIAL & ARCHITECTURE ACCREDITATION
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer"
                title="Close Pass"
              >
                <X className="w-4 h-4 stroke-3" />
              </motion.button>
            </div>

            {/* Neo-Brutalist Certificate Card Printable View */}
            <div className="p-4 sm:p-6 bg-[#121420] overflow-y-auto max-h-[75vh]">
              <div
                ref={certCardRef}
                className="relative bg-[#0A0C14] border-4 border-black p-5 sm:p-8 brutal-shadow-yellow text-center space-y-5 overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(#2A3048 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Decorative Brutalist Corner Stamp Badges */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-neo-pink text-white font-mono text-[9px] font-black uppercase border border-black">
                  ACC-NO: {certId.slice(-8)}
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-neo-mint text-black font-mono text-[9px] font-black uppercase border border-black flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIED LIVE</span>
                </div>

                {/* Issuer Seal */}
                <div className="pt-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-neo-yellow text-black border-3 border-black brutal-shadow-sm -rotate-2">
                    <Trophy className="w-8 h-8 fill-black" />
                  </div>
                </div>

                {/* Certificate Sub-headers */}
                <div className="space-y-1">
                  <div className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest text-neo-yellow">
                    SKETCHCAST INTERACTIVE ARCHITECTURE ARENA
                  </div>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-heavy uppercase tracking-tight text-white leading-tight">
                    MASTERCLASS PASS OF MERIT
                  </h1>
                  <p className="text-[11px] sm:text-xs font-mono text-slate-400">
                    This official certificate verifies that attendee
                  </p>
                </div>

                {/* Recipient Full Name */}
                <div className="py-2 border-y-2 border-neo-yellow/30 bg-black/40">
                  <span className="text-2xl sm:text-4xl font-heavy uppercase tracking-wider text-neo-yellow font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {recipientName || 'ANONYMOUS ARCHITECT'}
                  </span>
                </div>

                {/* Event Description */}
                <div className="space-y-1 max-w-lg mx-auto">
                  <p className="text-[11px] sm:text-xs font-mono text-slate-300 leading-relaxed">
                    has actively engaged in the live technical challenges, audience collaboration, and architecture design session for
                  </p>
                  <p className="text-sm sm:text-base font-heavy uppercase tracking-tight text-neo-mint">
                    "{roomTitle}" (ROOM #{roomCode})
                  </p>
                </div>

                {/* Earned Badges Ribbon */}
                {badges.length > 0 && (
                  <div className="py-2.5 px-3 bg-[#131622] border-2 border-black">
                    <div className="text-[10px] font-mono font-black uppercase text-slate-400 mb-2 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-neo-yellow" />
                      <span>LIVE BADGES ACCREDITED</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {badges.map((b) => {
                        const style = getRarityBadgeStyle(b.rarity);
                        return (
                          <span
                            key={b.id}
                            className={`flex items-center space-x-1 text-[9px] sm:text-[10px] font-mono font-black uppercase px-2 py-0.5 border ${style.bg} ${style.text} ${style.border} ${style.glow}`}
                            title={b.desc}
                          >
                            <span>{b.icon}</span>
                            <span>{b.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Credentials & Verifiable QR */}
                <div className="pt-4 border-t-2 border-black flex items-center justify-between flex-wrap gap-4 text-left">
                  {/* Performance stats */}
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">FINAL SCORE:</span>
                      <span className="font-heavy text-neo-yellow text-sm sm:text-base">{score} PTS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">SESSION RANK:</span>
                      <span className="font-heavy text-neo-cyan text-xs sm:text-sm">
                        RANK #{rank} OF {totalAttendees} ATTENDEES
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">ISSUED ON:</span>
                      <span className="font-bold text-white text-xs">{issueDate}</span>
                    </div>
                  </div>

                  {/* Verifiable QR Code matrix */}
                  <div className="flex items-center gap-3 bg-white p-2 border-2 border-black brutal-shadow-sm shrink-0">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={72}
                      level="M"
                      includeMargin={false}
                    />
                    <div className="font-mono text-[9px] text-black font-bold uppercase space-y-0.5 leading-tight">
                      <div className="font-black">SCAN TO VERIFY</div>
                      <div className="text-slate-600">ID: {certId.slice(0, 14)}</div>
                      <div className="text-slate-600">SKETCHCAST AUTH</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-3 sm:p-4 bg-neo-card border-t-4 border-black flex items-center justify-between flex-wrap gap-2 font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-neo-yellow text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copied ? 'LINK COPIED!' : 'COPY VERIFY LINK'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-neo-cyan text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT / PDF PASS</span>
                </motion.button>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShareLinkedIn}
                  className="px-2.5 py-1.5 bg-[#0077B5] text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>LINKEDIN</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleShareTwitter}
                  className="px-2.5 py-1.5 bg-[#1DA1F2] text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3 h-3" />
                  <span>X / TWITTER</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
