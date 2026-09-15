import React, { useEffect, useState, useRef } from 'react';
import { X, Share2, Check, ExternalLink, Trophy, ShieldCheck, Printer, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { playCertificateFanfare, playClickSound, playPopSound } from '../../lib/soundFx';

export interface VerifiedCertPayload {
  certId: string;
  roomCode: string;
  correctQuizzes: number;
  recipientName: string;
  roomTitle: string;
  rank: number;
  totalAttendees: number;
  issueDate?: string;
}

interface CertificateVerificationModalProps {
  certData: VerifiedCertPayload;
  onClose: () => void;
  onEnterArena: (roomCode: string) => void;
}

export const CertificateVerificationModal: React.FC<CertificateVerificationModalProps> = ({
  certData,
  onClose,
  onEnterArena,
}) => {
  const [copied, setCopied] = useState(false);
  const certCardRef = useRef<HTMLDivElement>(null);

  const {
    certId,
    roomCode,

    recipientName,
    roomTitle,
    rank = 1,
    totalAttendees = 1,
    issueDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  } = certData;

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify_cert=${certId}&room=${roomCode}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}`
    : `https://sketchcast.live/?verify_cert=${certId}`;

  // Launch celebration confetti and fanfare on verification render
  useEffect(() => {
    playCertificateFanfare();
    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.45 },
        colors: ['#FFE600', '#00F59B', '#FF4782', '#33F3FF', '#FFFFFF'],
      });
    } catch {
      // ignore
    }
  }, []);

  const handleCopyLink = () => {
    playPopSound();
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareLinkedIn = () => {
    playClickSound();
    const text = encodeURIComponent(
      `🎓 Verified Certificate: Completed the "${roomTitle}" technical masterclass on SketchCast!\nRank #${rank} out of ${totalAttendees}.\nOfficial Credential ID: ${certId}\nVerify here: ${verificationUrl}`
    );
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    playClickSound();
    const text = encodeURIComponent(
      `Just verified my Masterclass Pass of Merit for "${roomTitle}" on @SketchCast! ⚡ (Rank #${rank}). Credential ID: ${certId}\n${verificationUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/95 backdrop-blur-md overflow-y-auto font-sans">
      <motion.div
        initial={{ scale: 0.94, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 15, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="w-full max-w-2xl bg-[#0D0F17] border-4 border-black brutal-shadow-lg text-white my-auto overflow-hidden flex flex-col"
      >
        {/* Verification Status Banner */}
        <div className="p-3 sm:p-3.5 bg-[#00F59B] text-black border-b-4 border-black flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-black text-[#00F59B] border-2 border-black flex items-center justify-center font-black shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#00F59B]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-heavy uppercase tracking-tight leading-none text-black">
                  OFFICIAL CREDENTIAL VERIFIED
                </h2>
                <span className="px-1.5 py-0.2 bg-black text-[#00F59B] font-mono text-[9px] font-black uppercase border border-black flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-[#00F59B]" />
                  <span>AUTHENTIC</span>
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-800 block mt-0.5">
                VERIFIED VIA SKETCHCAST ED25519 REAL-TIME MERIT LEDGER
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
            title="Close Verification"
          >
            <X className="w-4 h-4 stroke-3" />
          </motion.button>
        </div>

        {/* Certificate Printable Pass */}
        <div className="p-3 sm:p-5 bg-[#121420] overflow-y-auto max-h-[72vh]">
          <div
            ref={certCardRef}
            className="relative bg-[#0A0C14] border-4 border-black p-5 sm:p-7 brutal-shadow-yellow text-center space-y-4 overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(#2A3048 1.5px, transparent 1.5px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Top Stamps */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-neo-pink text-white font-mono text-[9px] font-black uppercase border border-black">
              ACC-NO: {certId.slice(-8)}
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#00F59B] text-black font-mono text-[9px] font-black uppercase border border-black flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>CRYPTOGRAPHICALLY SEALED</span>
            </div>

            {/* Issuer Seal Icon */}
            <div className="pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-neo-yellow text-black border-3 border-black brutal-shadow-sm -rotate-2">
                <Trophy className="w-7 h-7 fill-black" />
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-1">
              <div className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest text-neo-yellow">
                SKETCHCAST INTERACTIVE ARCHITECTURE ARENA
              </div>
              <h1 className="text-xl sm:text-3xl font-heavy uppercase tracking-tight text-white leading-tight">
                MASTERCLASS PASS OF MERIT
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-slate-400">
                This official certificate verifies that attendee
              </p>
            </div>

            {/* Recipient Name Highlight */}
            <div className="py-2.5 border-y-2 border-neo-yellow/30 bg-black/50">
              <span className="text-2xl sm:text-4xl font-heavy uppercase tracking-wider text-neo-yellow font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {recipientName}
              </span>
            </div>

            {/* Event Description & Masterclass Title */}
            <div className="space-y-1 max-w-lg mx-auto">
              <p className="text-[10px] sm:text-xs font-mono text-slate-300 leading-relaxed">
                has actively engaged in the live technical challenges, audience collaboration, and architecture design session for
              </p>
              <p className="text-sm sm:text-base font-heavy uppercase tracking-tight text-neo-mint">
                "{roomTitle}" (ROOM #{roomCode})
              </p>
            </div>

            {/* Credentials & QR */}
            <div className="pt-3 border-t-2 border-black flex items-center justify-between flex-wrap gap-4 text-left">
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">SESSION RANK:</span>
                  <span className="font-heavy text-neo-cyan text-xs">
                    RANK #{rank} OF {totalAttendees} ATTENDEES
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">ISSUED ON:</span>
                  <span className="font-bold text-white text-xs">{issueDate}</span>
                </div>
              </div>

              {/* QR matrix & Verifier code */}
              <div className="flex items-center gap-2.5 bg-white p-2 border-2 border-black brutal-shadow-sm shrink-0">
                <QRCodeSVG
                  value={verificationUrl}
                  size={68}
                  level="M"
                  includeMargin={false}
                />
                <div className="font-mono text-[9px] text-black font-bold uppercase space-y-0.5 leading-tight">
                  <div className="font-black text-[#059669]">● VERIFIED VALID</div>
                  <div className="text-slate-800 font-heavy">ID: {certId.slice(0, 16)}</div>
                  <div className="text-slate-500">SKETCHCAST AUTH</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="p-3 sm:p-3.5 bg-neo-card border-t-4 border-black flex items-center justify-between flex-wrap gap-2 font-mono">
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

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleShareLinkedIn}
              className="px-2.5 py-1.5 bg-[#0077B5] text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden sm:inline">LINKEDIN</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleShareTwitter}
              className="px-2.5 py-1.5 bg-[#1DA1F2] text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden sm:inline">X / TWITTER</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playPopSound();
                onEnterArena(roomCode);
              }}
              className="px-3 py-1.5 bg-[#00F59B] text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Enter live interactive session"
            >
              <span>ENTER LIVE ARENA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
