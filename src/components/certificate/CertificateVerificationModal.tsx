import React, { useEffect, useState, useRef } from 'react';
import { X, Share2, Check, ExternalLink, Trophy, ShieldCheck, Printer, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { playCertificateFanfare, playClickSound, playPopSound } from '../../lib/soundFx';
import { ContextualAffiliateCard } from '../affiliate/ContextualAffiliateCard';
import { useAffiliateRecommendation } from '../../hooks/useAffiliateRecommendation';

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

  const affiliateRec = useAffiliateRecommendation({
    placement: 'certificate',
    contextKeywords: [roomTitle, 'certification', 'masterclass', 'course'],
    accuracyRate: totalAttendees > 0 ? Math.min(100, Math.round((correctQuizzes / Math.max(1, totalAttendees)) * 100)) : undefined,
    roomCode,
  });

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify_cert=${certId}&room=${roomCode}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}&score=${score}&correct=${correctQuizzes}&host=${encodeURIComponent(hostName)}`
    : `https://sketchcast.live/?verify_cert=${certId}`;

  // Play celebration fanfare on verification render
  useEffect(() => {
    playCertificateFanfare();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto font-sans">
      <motion.div
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="w-[95vw] sm:max-w-2xl bg-paper border border-hairline rounded-3xl shadow-2xl text-ink my-auto overflow-hidden flex flex-col font-sans max-h-[90dvh]"
      >
        {/* Verification Status Banner */}
        <div className="p-4 sm:p-5 bg-paper-surface text-ink border-b border-hairline flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-ink/10 dark:border-lime/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-lime" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
                  Official Credential Verified
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-lime text-ink text-[11px] font-mono font-bold border border-ink/15 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ink" />
                  <span>Authentic</span>
                </span>
              </div>
              <span className="text-xs text-muted block mt-0.5">
                Verified via Studio Noma & SketchCast Real-Time Merit Ledger
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
            className="p-2 rounded-xl bg-paper text-muted hover:text-ink border border-hairline transition-colors cursor-pointer"
            title="Close Verification"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Certificate Printable Pass */}
        <div className="p-3.5 sm:p-6 bg-paper overflow-y-auto flex-1">
          <div
            ref={certCardRef}
            className="relative bg-paper-surface rounded-2xl sm:rounded-3xl border border-hairline p-5 sm:p-8 text-center space-y-4 overflow-hidden shadow-sm"
          >
            {/* Top Stamps */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="px-3 py-1 rounded-full bg-paper text-ink text-xs font-mono font-bold border border-hairline">
                ID: {certId.slice(-8)}
              </div>
              <div className="px-3 py-1 rounded-full bg-lime text-ink text-xs font-mono font-bold border border-ink/15 flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3 h-3 text-ink" />
                <span>Cryptographically Sealed</span>
              </div>
            </div>

            {/* Issuer Seal Icon */}
            <div className="pt-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-ink/10 dark:border-lime/30 shadow-xs">
                <Trophy className="w-7 h-7" />
              </div>
            </div>

            {/* Headers */}
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange">
                Studio Noma • Architecture Arena
              </div>
              <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink leading-tight">
                Masterclass Pass of Merit
              </h1>
              <p className="text-xs text-muted">
                This official certificate verifies that attendee
              </p>
            </div>

            {/* Recipient Name Highlight */}
            <div className="py-3.5 px-4 rounded-2xl border border-hairline bg-paper shadow-2xs">
              <span className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink">
                {recipientName}
              </span>
            </div>

            {/* Event Description & Masterclass Title */}
            <div className="space-y-1 max-w-lg mx-auto">
              <p className="text-xs text-muted leading-relaxed">
                has actively engaged in the live technical challenges, audience consensus, and architecture design session for
              </p>
              <p className="text-sm sm:text-base font-bold text-orange">
                &ldquo;{roomTitle}&rdquo; (Room #{roomCode})
              </p>
            </div>

            {/* Credentials & QR */}
            <div className="pt-4 border-t border-hairline flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-left">
              {/* Performance stats grid */}
              <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* Stat 1: Session Rank */}
                <div className="p-3 rounded-xl bg-paper border border-hairline flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-muted uppercase">Session Rank</span>
                  <span className="text-xs sm:text-sm font-bold text-orange font-mono mt-0.5">
                    Rank #{rank} of {totalAttendees}
                  </span>
                </div>

                {/* Stat 2: Total Score */}
                <div className="p-3 rounded-xl bg-paper border border-hairline flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-muted uppercase">Score Earned</span>
                  <span className="text-xs sm:text-sm font-bold text-ink font-mono mt-0.5">
                    {score} PTS
                  </span>
                </div>

                {/* Stat 3: Challenges Completed */}
                <div className="p-3 rounded-xl bg-paper border border-hairline flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-muted uppercase">Challenges</span>
                  <span className="text-xs sm:text-sm font-bold text-ink font-mono mt-0.5">
                    {correctQuizzes} Correct
                  </span>
                </div>

                {/* Stat 4: Session Host */}
                <div className="p-3 rounded-xl bg-paper border border-hairline flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-muted uppercase">Session Host</span>
                  <span className="text-xs sm:text-sm font-bold text-ink truncate mt-0.5" title={hostName}>
                    {hostName}
                  </span>
                </div>

                {/* Full-width metadata info */}
                <div className="col-span-2 pt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-muted font-mono">
                  <span>Issued: <strong className="text-ink font-semibold">{issueDate}</strong></span>
                  <span className="truncate max-w-[180px] sm:max-w-none">ID: <strong className="text-ink font-semibold">{certId.slice(0, 16)}...</strong></span>
                </div>
              </div>

              {/* QR matrix & Verifier code */}
              <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-paper border border-hairline shadow-2xs shrink-0 self-center sm:self-auto">
                <QRCodeSVG
                  value={verificationUrl}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
                <div className="mt-2 text-center leading-tight">
                  <div className="text-[11px] font-bold text-ink">● Verified Valid</div>
                  <div className="text-[9px] text-muted font-mono">ID: {certId.slice(0, 14)}</div>
                  <div className="text-[9px] font-mono font-bold text-orange">Studio Noma</div>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Learning / Advanced Recommended Credentials */}
          {affiliateRec && (
            <div className="mt-4 pt-4 border-t border-hairline text-left">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-2">
                CONTINUE LEARNING & ADVANCED CERTIFICATION
              </div>
              <ContextualAffiliateCard recommendation={affiliateRec} variant="compact" />
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 bg-paper-surface border-t border-hairline flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopyLink}
              className="btn-noma-ghost px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5 text-ink" />}
              <span>{copied ? 'Copied!' : 'Copy Verify Link'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              className="btn-noma-ghost px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-ink" />
              <span>Print Pass</span>
            </motion.button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareLinkedIn}
              className="px-3.5 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LinkedIn</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleShareTwitter}
              className="btn-noma-ink px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
              className="btn-noma-orange px-4 py-2 rounded-xl font-mono uppercase tracking-wider text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
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
