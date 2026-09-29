import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Award,
  Trophy,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { playCertificateFanfare, playClickSound, playPopSound } from '../../lib/soundFx';
import { ContextualAffiliateCard } from '../affiliate/ContextualAffiliateCard';
import { useAffiliateRecommendation } from '../../hooks/useAffiliateRecommendation';
import type { SponsorCTA } from '../../types';

interface MasterclassCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  roomTitle: string;
  roomCode: string;
  rank?: number;
  totalAttendees?: number;
  score?: number;
  correctQuizzes?: number;
  hostName?: string;
  sponsorCTA?: SponsorCTA | null;
}

export const MasterclassCertificateModal: React.FC<MasterclassCertificateModalProps> = ({
  isOpen,
  onClose,
  recipientName,
  roomTitle,
  roomCode,
  rank = 1,
  totalAttendees = 1,
  score = 0,
  correctQuizzes = 0,
  hostName = 'Arena Host',
  sponsorCTA,
}) => {
  const [downloading, setDownloading] = useState(false);

  const affiliateRec = useAffiliateRecommendation({
    placement: 'certificate',
    contextKeywords: [roomTitle, 'certification', 'masterclass', 'course'],
    accuracyRate: totalAttendees > 0 ? Math.min(100, Math.round((correctQuizzes / Math.max(1, totalAttendees)) * 100)) : undefined,
    roomCode,
    sponsorCTA,
  });

  const certCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

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
    ? `${window.location.origin}/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}&score=${score}&correct=${correctQuizzes}&host=${encodeURIComponent(hostName)}`
    : `https://sketchcast.live/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}&score=${score}&correct=${correctQuizzes}&host=${encodeURIComponent(hostName)}`;

  // Draw high-resolution 1200x700 Certificate Card on Canvas (Studio Noma Editorial Aesthetic)
  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 700;

    // 1. Background (Studio Noma Warm Paper Canvas)
    ctx.fillStyle = '#F5F0E9';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Dot Matrix Texture
    ctx.fillStyle = 'rgba(16, 19, 19, 0.06)';
    for (let x = 24; x < width - 24; x += 24) {
      for (let y = 24; y < height - 24; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Hairline Outer Frame
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#101313';
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner subtle hairline border
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.15)';
    ctx.strokeRect(22, 22, width - 44, height - 44);

    // 4. Corner Accent Blocks
    ctx.fillStyle = '#FF6337';
    ctx.fillRect(10, 10, 8, 8);
    ctx.fillRect(width - 18, 10, 8, 8);
    ctx.fillRect(10, height - 18, 8, 8);
    ctx.fillRect(width - 18, height - 18, 8, 8);

    // Top-Left ID Stamp
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(36, 36, 180, 30);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.2)';
    ctx.strokeRect(36, 36, 180, 30);
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 11px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ID: ${certId.slice(-8)}`, 126, 55);

    // Top-Right Verified Stamp (Lime Badge)
    ctx.fillStyle = '#D7FF2F';
    ctx.fillRect(width - 240, 36, 204, 30);
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.25)';
    ctx.strokeRect(width - 240, 36, 204, 30);
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 11px "DM Mono", monospace';
    ctx.fillText('VERIFIED CREDENTIAL', width - 138, 55);

    // 5. Center Seal (Ink + Lime Box)
    ctx.save();
    ctx.translate(width / 2, 88);
    ctx.fillStyle = '#101313';
    ctx.fillRect(-26, -26, 52, 52);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#D7FF2F';
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', 0, 9);
    ctx.restore();

    // 6. Certificate Title & Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF6337';
    ctx.font = 'bold 12px "DM Mono", monospace';
    ctx.fillText('STUDIO NOMA • SKETCHCAST MASTERCLASS ARENA', width / 2, 148);

    ctx.fillStyle = '#101313';
    ctx.font = 'bold 36px "DM Serif Display", serif';
    ctx.fillText('MASTERCLASS PASS OF MERIT', width / 2, 190);

    ctx.fillStyle = '#65655F';
    ctx.font = '13px "DM Mono", monospace';
    ctx.fillText('This official credential verifies that attendee', width / 2, 218);

    // 7. Recipient Name Banner Box
    const bannerY = 236;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(160, bannerY, width - 320, 64);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.15)';
    ctx.strokeRect(160, bannerY, width - 320, 64);

    ctx.fillStyle = '#101313';
    ctx.font = 'bold 34px "DM Serif Display", serif';
    ctx.fillText((recipientName || 'ANONYMOUS PARTICIPANT').toUpperCase(), width / 2, bannerY + 44);

    // 8. Event Description & Room
    ctx.fillStyle = '#65655F';
    ctx.font = '13px "Manrope", sans-serif';
    ctx.fillText(
      'has actively engaged in the live technical challenges, audience consensus, and architecture design session for',
      width / 2,
      328
    );

    ctx.fillStyle = '#FF6337';
    ctx.font = 'bold 17px "Manrope", sans-serif';
    ctx.fillText(`"${roomTitle.toUpperCase()}" (ROOM #${roomCode.toUpperCase()})`, width / 2, 354);

    // 9. Footer Details - Balanced Grid Layout
    const footerY = 405;
    ctx.textAlign = 'left';

    // Stat 1: Session Rank
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(70, footerY, 240, 52);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.12)';
    ctx.strokeRect(70, footerY, 240, 52);
    ctx.fillStyle = '#65655F';
    ctx.font = 'bold 10px "DM Mono", monospace';
    ctx.fillText('SESSION RANK', 85, footerY + 20);
    ctx.fillStyle = '#FF6337';
    ctx.font = 'bold 15px "DM Mono", monospace';
    ctx.fillText(`RANK #${rank} OF ${totalAttendees}`, 85, footerY + 41);

    // Stat 2: Total Score Earned
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(325, footerY, 240, 52);
    ctx.strokeRect(325, footerY, 240, 52);
    ctx.fillStyle = '#65655F';
    ctx.font = 'bold 10px "DM Mono", monospace';
    ctx.fillText('SCORE EARNED', 340, footerY + 20);
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 15px "DM Mono", monospace';
    ctx.fillText(`${score} PTS`, 340, footerY + 41);

    // Stat 3: Challenges Solved
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(70, footerY + 62, 240, 52);
    ctx.strokeRect(70, footerY + 62, 240, 52);
    ctx.fillStyle = '#65655F';
    ctx.font = 'bold 10px "DM Mono", monospace';
    ctx.fillText('CHALLENGES', 85, footerY + 82);
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 15px "DM Mono", monospace';
    ctx.fillText(`${correctQuizzes} SOLVED`, 85, footerY + 103);

    // Stat 4: Session Host
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(325, footerY + 62, 240, 52);
    ctx.strokeRect(325, footerY + 62, 240, 52);
    ctx.fillStyle = '#65655F';
    ctx.font = 'bold 10px "DM Mono", monospace';
    ctx.fillText('SESSION HOST', 340, footerY + 82);
    ctx.fillStyle = '#101313';
    ctx.font = 'bold 14px "Manrope", sans-serif';
    ctx.fillText(hostName, 340, footerY + 103);

    // Metadata line (Issued on & Certificate ID)
    ctx.fillStyle = '#65655F';
    ctx.font = '11px "DM Mono", monospace';
    ctx.fillText(`ISSUED: ${issueDate.toUpperCase()}  •  CREDENTIAL: ${certId}`, 70, footerY + 142);

    // Right QR Code Box
    const qrCanvas = qrContainerRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qx = width - 260;
      const qy = footerY - 5;
      const qw = 190;
      const qh = 160;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qx, qy, qw, qh);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(16, 19, 19, 0.2)';
      ctx.strokeRect(qx, qy, qw, qh);

      ctx.drawImage(qrCanvas, qx + 35, qy + 12, 120, 120);

      ctx.fillStyle = '#101313';
      ctx.font = 'bold 11px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VERIFY', qx + qw / 2, qy + 146);
      ctx.textAlign = 'left';
    }

    // 10. Bottom Platform Watermark
    ctx.fillStyle = '#65655F';
    ctx.font = '11px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Verified Realtime Keynote Credential • Powered by Studio Noma & SketchCast', width / 2, height - 16);
  }, [certId, recipientName, roomCode, roomTitle, rank, totalAttendees, issueDate, score, correctQuizzes, hostName]);

  // Launch celebration fanfare EXACTLY ONCE per modal opening
  const celebrationFiredRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      if (!celebrationFiredRef.current) {
        celebrationFiredRef.current = true;
        playCertificateFanfare();
      }
    } else {
      celebrationFiredRef.current = false;
    }
  }, [isOpen]);

  // Separate effect to draw certificate onto canvas when opened or dependencies update
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(drawCertificate, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, drawCertificate]);

  // Convert canvas to PNG Blob
  const getCertificateBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleDownloadPass = async () => {
    playPopSound();
    setDownloading(true);
    try {
      const blob = await getCertificateBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `sketchcast-pass-${recipientName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto font-sans"
        >
          {/* Hidden Canvas Elements for High-Res PNG Generation & QR Drawing */}
          <canvas ref={canvasRef} width={1200} height={700} className="hidden" />
          <div ref={qrContainerRef} className="hidden">
            <QRCodeCanvas value={verificationUrl} size={140} level="M" includeMargin={false} />
          </div>

          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="w-[95vw] sm:max-w-2xl bg-paper border border-hairline rounded-3xl shadow-2xl text-ink my-auto overflow-hidden flex flex-col relative font-sans max-h-[90dvh]"
          >
            {/* Modal Header Bar */}
            <div className="p-4 sm:p-5 bg-paper-surface text-ink border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-ink/10 dark:border-lime/30 flex items-center justify-center font-bold shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-ink">
                    Masterclass Completion Pass
                  </h2>
                  <span className="text-xs text-muted">
                    Verifiable Editorial Credential & Merit Pass
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
                title="Close Pass"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Certificate Card View */}
            <div className="p-3.5 sm:p-6 bg-paper overflow-y-auto flex-1">
              <div
                ref={certCardRef}
                className="relative bg-paper-surface rounded-2xl sm:rounded-3xl border border-hairline p-5 sm:p-8 text-center space-y-4 sm:space-y-5 overflow-hidden shadow-sm"
              >
                {/* Clean Verification Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="px-3 py-1 rounded-full bg-paper text-ink text-xs font-mono font-bold border border-hairline">
                    ID: {certId.slice(-8)}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-lime text-ink text-xs font-mono font-bold border border-ink/15 flex items-center gap-1.5 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-ink" />
                    <span>Verified Credential</span>
                  </div>
                </div>

                {/* Issuer Seal */}
                <div className="pt-1">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#101313] dark:bg-lime/20 text-lime dark:text-lime border border-ink/10 dark:border-lime/30 shadow-xs">
                    <Trophy className="w-7 h-7" />
                  </div>
                </div>

                {/* Certificate Sub-headers */}
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange">
                    Studio Noma • Interactive Masterclass Arena
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink leading-tight">
                    Masterclass Pass of Merit
                  </h1>
                  <p className="text-xs text-muted">
                    This official certificate verifies that attendee
                  </p>
                </div>

                {/* Recipient Full Name */}
                <div className="py-3.5 px-4 rounded-2xl border border-hairline bg-paper shadow-2xs">
                  <span className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink">
                    {recipientName || 'Anonymous Participant'}
                  </span>
                </div>

                {/* Event Description */}
                <div className="space-y-1 max-w-lg mx-auto">
                  <p className="text-xs text-muted leading-relaxed">
                    has actively engaged in the live technical challenges, audience consensus, and architecture design session for
                  </p>
                  <p className="text-sm sm:text-base font-bold text-orange">
                    &ldquo;{roomTitle}&rdquo; (Room #{roomCode})
                  </p>
                </div>

                {/* Footer Credentials & Verifiable QR */}
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

                    {/* Stat 3: Challenges Solved */}
                    <div className="p-3 rounded-xl bg-paper border border-hairline flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-muted uppercase">Challenges</span>
                      <span className="text-xs sm:text-sm font-bold text-ink font-mono mt-0.5">
                        {correctQuizzes} Solved
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
                    <div className="col-span-2 pt-1 flex items-center justify-between flex-wrap gap-1 text-[10px] sm:text-[11px] text-muted font-mono">
                      <span className="shrink-0">Issued: <strong className="text-ink font-semibold">{issueDate}</strong></span>
                      <span className="truncate max-w-[170px] sm:max-w-none">ID: <strong className="text-ink font-semibold">{certId.slice(0, 16)}...</strong></span>
                    </div>
                  </div>

                  {/* Verifiable QR Code matrix */}
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-paper border border-hairline shadow-2xs shrink-0 self-center sm:self-auto">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={100}
                      level="M"
                      includeMargin={false}
                    />
                    <div className="mt-2 text-center leading-tight">
                      <div className="text-[11px] font-bold text-ink tracking-tight">Scan to Verify</div>
                      <div className="text-[9px] text-muted font-mono">ID: {certId.slice(-8)}</div>
                      <div className="text-[9px] font-mono font-bold text-orange">Studio Noma</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contextual Career & Certification Acceleration */}
              {affiliateRec && (
                <div className="mt-4 pt-4 border-t border-hairline text-left">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-2">
                    RECOMMENDED NEXT STEP CERTIFICATION
                  </div>
                  <ContextualAffiliateCard recommendation={affiliateRec} variant="compact" />
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar - Single Prominent Download Pass Button */}
            <div className="p-4 sm:p-5 bg-paper-surface border-t border-hairline flex items-center justify-center shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadPass}
                disabled={downloading}
                className="btn-noma-orange w-full sm:w-auto min-w-[240px] px-8 py-3 rounded-xl font-mono uppercase tracking-wider text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                title="Download High-Resolution Pass"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Generating Pass...' : 'Download Pass'}</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

