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
  score?: number;
  hostName?: string;
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
    correctQuizzes = 0,
    recipientName,
    roomTitle,
    rank = 1,
    totalAttendees = 1,
    score = 0,
    hostName = 'Arena Host',
    issueDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  } = certData;

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify_cert=${certId}&room=${roomCode}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}&score=${score}&correct=${correctQuizzes}&host=${encodeURIComponent(hostName)}`
    : `https://sketchcast.live/?verify_cert=${certId}`;

  // Launch celebration confetti and fanfare on verification render
  useEffect(() => {
    playCertificateFanfare();
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.45 },
        colors: ['#3B82F6', '#60A5FA', '#1D4ED8', '#FAFAFA', '#71717A'],
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto font-sans">
      <motion.div
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="w-full max-w-2xl bg-[#101014] border border-white/[0.08] rounded-2xl shadow-2xl text-[#FAFAFA] my-auto overflow-hidden flex flex-col font-sans"
      >
        {/* Verification Status Banner */}
        <div className="p-4 sm:p-5 bg-[#141418] text-[#FAFAFA] border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-white font-display">
                  Official Credential Verified
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-medium border border-blue-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  <span>Authentic</span>
                </span>
              </div>
              <span className="text-xs text-zinc-400 block mt-0.5">
                Verified via SketchCast Real-Time Merit Ledger
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.06] transition-colors cursor-pointer"
            title="Close Verification"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Certificate Printable Pass */}
        <div className="p-4 sm:p-6 bg-[#0B0B0E] overflow-y-auto max-h-[72vh]">
          <div
            ref={certCardRef}
            className="relative bg-[#121216] rounded-2xl border border-white/[0.1] p-5 sm:p-8 text-center space-y-4 overflow-hidden shadow-2xl"
            style={{
              backgroundImage: 'radial-gradient(#27272A 1.5px, transparent 1.5px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Top Stamps */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                ID: {certId.slice(-8)}
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                <span>Cryptographically Sealed</span>
              </div>
            </div>

            {/* Issuer Seal Icon */}
            <div className="pt-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Trophy className="w-7 h-7" />
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-400">
                SketchCast Interactive Architecture Arena
              </div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-tight font-display">
                Masterclass Pass of Merit
              </h1>
              <p className="text-xs text-zinc-400">
                This official certificate verifies that attendee
              </p>
            </div>

            {/* Recipient Name Highlight */}
            <div className="py-3 rounded-xl border border-white/[0.08] bg-[#0D0D10]">
              <span className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-display">
                {recipientName}
              </span>
            </div>

            {/* Event Description & Masterclass Title */}
            <div className="space-y-1 max-w-lg mx-auto">
              <p className="text-xs text-zinc-400 leading-relaxed">
                has actively engaged in the live technical challenges, audience consensus, and architecture design session for
              </p>
              <p className="text-sm sm:text-base font-semibold text-blue-400 font-display">
                &ldquo;{roomTitle}&rdquo; (Room #{roomCode})
              </p>
            </div>

            {/* Credentials & QR - Balanced Grid Layout */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-left">
              {/* Performance stats grid */}
              <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* Stat 1: Session Rank */}
                <div className="p-2.5 rounded-xl bg-[#0E0E12] border border-white/[0.06] flex flex-col">
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">Session Rank</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-400 font-mono mt-0.5">
                    Rank #{rank} of {totalAttendees}
                  </span>
                </div>

                {/* Stat 2: Total Score */}
                <div className="p-2.5 rounded-xl bg-[#0E0E12] border border-white/[0.06] flex flex-col">
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">Score Earned</span>
                  <span className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                    {score} PTS
                  </span>
                </div>

                {/* Stat 3: Challenges Completed */}
                <div className="p-2.5 rounded-xl bg-[#0E0E12] border border-white/[0.06] flex flex-col">
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">Challenges</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {correctQuizzes} Correct
                  </span>
                </div>

                {/* Stat 4: Session Host */}
                <div className="p-2.5 rounded-xl bg-[#0E0E12] border border-white/[0.06] flex flex-col">
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">Session Host</span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate mt-0.5" title={hostName}>
                    {hostName}
                  </span>
                </div>

                {/* Full-width metadata info */}
                <div className="col-span-2 pt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                  <span>Issued: <strong className="text-zinc-400 font-normal">{issueDate}</strong></span>
                  <span className="truncate max-w-[180px] sm:max-w-none">ID: <strong className="text-zinc-400 font-normal">{certId.slice(0, 16)}...</strong></span>
                </div>
              </div>

              {/* QR matrix & Verifier code - Enlarged (100px) */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200 shadow-md shrink-0 self-center sm:self-auto">
                <QRCodeSVG
                  value={verificationUrl}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
                <div className="mt-2 text-center leading-tight">
                  <div className="text-[11px] font-bold text-emerald-600">● Verified Valid</div>
                  <div className="text-[9px] text-zinc-500 font-mono">ID: {certId.slice(0, 14)}</div>
                  <div className="text-[9px] font-semibold text-blue-600">SketchCast Live</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-[#141418] border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.06] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Verify Link'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.06] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareLinkedIn}
              className="px-3.5 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LinkedIn</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareTwitter}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs border border-white/[0.08] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">X / Twitter</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playPopSound();
                onEnterArena(roomCode);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              title="Enter live interactive session"
            >
              <span>Enter Live Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
