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
import confetti from 'canvas-confetti';
import { playCertificateFanfare, playClickSound, playPopSound } from '../../lib/soundFx';

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
}) => {
  const [downloading, setDownloading] = useState(false);

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

  // Draw high-resolution 1200x700 Certificate Card on Canvas
  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 700;

    // 1. Background (Obsidian Blueprint Canvas)
    ctx.fillStyle = '#0A0A0C';
    ctx.fillRect(0, 0, width, height);

    // 2. Dot Matrix Pattern
    ctx.fillStyle = '#16161E';
    for (let x = 24; x < width - 24; x += 24) {
      for (let y = 24; y < height - 24; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Blueprint Hairline Border with Cobalt Accent
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3B82F6';
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Inner subtle border
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#27272A';
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 4. Accreditation Badges
    // Top-Left ID Stamp
    ctx.fillStyle = '#141418';
    ctx.fillRect(30, 30, 170, 28);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3B82F6';
    ctx.strokeRect(30, 30, 170, 28);
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ID: ${certId.slice(-8)}`, 115, 48);

    // Top-Right Verified Stamp
    ctx.fillStyle = '#141418';
    ctx.fillRect(width - 230, 30, 200, 28);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.strokeRect(width - 230, 30, 200, 28);
    ctx.fillStyle = '#FAFAFA';
    ctx.fillText('🛡️ VERIFIED CREDENTIAL', width - 130, 48);

    // 5. Center Seal (Trophy Icon Box)
    ctx.save();
    ctx.translate(width / 2, 86);
    ctx.fillStyle = '#141418';
    ctx.fillRect(-26, -26, 52, 52);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#3B82F6';
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.font = '26px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 0, 9);
    ctx.restore();

    // 6. Certificate Title & Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('SKETCHCAST INTERACTIVE MASTERCLASS ARENA', width / 2, 145);

    ctx.fillStyle = '#FAFAFA';
    ctx.font = '900 32px "Space Grotesk", sans-serif';
    ctx.fillText('MASTERCLASS PASS OF MERIT', width / 2, 185);

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('This official certificate verifies that attendee', width / 2, 214);

    // 7. Recipient Name Banner Box
    const bannerY = 232;
    ctx.fillStyle = '#121216';
    ctx.fillRect(160, bannerY, width - 320, 60);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#3B82F6';
    ctx.strokeRect(160, bannerY, width - 320, 60);

    ctx.fillStyle = '#FAFAFA';
    ctx.font = '900 34px "Space Grotesk", sans-serif';
    ctx.fillText((recipientName || 'ANONYMOUS PARTICIPANT').toUpperCase(), width / 2, bannerY + 43);

    // 8. Event Description & Room
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.fillText(
      'has actively engaged in the live technical challenges, audience consensus, and architecture design session for',
      width / 2,
      322
    );

    ctx.fillStyle = '#3B82F6';
    ctx.font = '900 17px "Space Grotesk", sans-serif';
    ctx.fillText(`"${roomTitle.toUpperCase()}" (ROOM #${roomCode.toUpperCase()})`, width / 2, 348);

    // 9. Footer Details - Balanced Grid Layout
    const footerY = 400;
    ctx.textAlign = 'left';

    // Stat 1: Session Rank
    ctx.fillStyle = '#121216';
    ctx.fillRect(70, footerY, 240, 52);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(70, footerY, 240, 52);
    ctx.fillStyle = '#71717A';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('SESSION RANK', 85, footerY + 20);
    ctx.fillStyle = '#3B82F6';
    ctx.font = '900 15px "JetBrains Mono", monospace';
    ctx.fillText(`RANK #${rank} OF ${totalAttendees}`, 85, footerY + 41);

    // Stat 2: Total Score Earned
    ctx.fillStyle = '#121216';
    ctx.fillRect(325, footerY, 240, 52);
    ctx.strokeRect(325, footerY, 240, 52);
    ctx.fillStyle = '#71717A';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('SCORE EARNED', 340, footerY + 20);
    ctx.fillStyle = '#FAFAFA';
    ctx.font = '900 15px "JetBrains Mono", monospace';
    ctx.fillText(`${score} PTS`, 340, footerY + 41);

    // Stat 3: Challenges Solved
    ctx.fillStyle = '#121216';
    ctx.fillRect(70, footerY + 62, 240, 52);
    ctx.strokeRect(70, footerY + 62, 240, 52);
    ctx.fillStyle = '#71717A';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('CHALLENGES', 85, footerY + 82);
    ctx.fillStyle = '#10B981';
    ctx.font = '900 15px "JetBrains Mono", monospace';
    ctx.fillText(`${correctQuizzes} SOLVED`, 85, footerY + 103);

    // Stat 4: Session Host
    ctx.fillStyle = '#121216';
    ctx.fillRect(325, footerY + 62, 240, 52);
    ctx.strokeRect(325, footerY + 62, 240, 52);
    ctx.fillStyle = '#71717A';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('SESSION HOST', 340, footerY + 82);
    ctx.fillStyle = '#FAFAFA';
    ctx.font = 'bold 14px "Space Grotesk", sans-serif';
    ctx.fillText(hostName, 340, footerY + 103);

    // Metadata line (Issued on & Certificate ID)
    ctx.fillStyle = '#71717A';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`ISSUED: ${issueDate.toUpperCase()}  •  CREDENTIAL: ${certId}`, 70, footerY + 142);

    // Right QR Code Box (Enlarged & high-contrast)
    const qrCanvas = qrContainerRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qx = width - 260;
      const qy = footerY - 5;
      const qw = 190;
      const qh = 160;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qx, qy, qw, qh);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#3B82F6';
      ctx.strokeRect(qx, qy, qw, qh);

      // Draw QR Code enlarged: 120x120 centered
      ctx.drawImage(qrCanvas, qx + 35, qy + 12, 120, 120);

      // QR label
      ctx.fillStyle = '#000000';
      ctx.font = '900 11px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VERIFY', qx + qw / 2, qy + 146);
      ctx.textAlign = 'left';
    }

    // 10. Bottom Platform Watermark
    ctx.fillStyle = '#52525B';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Verified Realtime Keynote Session • Powered by SketchCast Live & Supabase', width / 2, height - 16);
  }, [certId, recipientName, roomCode, roomTitle, rank, totalAttendees, issueDate, score, correctQuizzes, hostName]);

  // Launch celebration fanfare and confetti EXACTLY ONCE per modal opening
  const celebrationFiredRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      if (!celebrationFiredRef.current) {
        celebrationFiredRef.current = true;
        playCertificateFanfare();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.45 },
            colors: ['#3B82F6', '#60A5FA', '#1D4ED8', '#FAFAFA', '#71717A'],
          });
        } catch {
          // ignore
        }
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
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-sans"
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
            className="w-full max-w-2xl bg-[#101014] border border-white/[0.08] rounded-2xl shadow-2xl text-[#FAFAFA] my-auto overflow-hidden flex flex-col relative font-sans"
          >
            {/* Modal Header Bar */}
            <div className="p-4 sm:p-5 bg-[#141418] text-[#FAFAFA] border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-white font-display">
                    Masterclass Completion Pass
                  </h2>
                  <span className="text-xs text-zinc-400">
                    Verifiable Credential & Achievement Pass
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
                title="Close Pass"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Certificate Card View */}
            <div className="p-4 sm:p-6 bg-[#0B0B0E] overflow-y-auto max-h-[72vh]">
              <div
                ref={certCardRef}
                className="relative bg-[#121216] rounded-2xl border border-white/[0.1] p-5 sm:p-7 text-center space-y-4 sm:space-y-5 overflow-hidden shadow-2xl"
                style={{
                  backgroundImage: 'radial-gradient(#27272A 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Clean Verification Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                    ID: {certId.slice(-8)}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Verified Credential</span>
                  </div>
                </div>

                {/* Issuer Seal */}
                <div className="pt-1">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Trophy className="w-7 h-7" />
                  </div>
                </div>

                {/* Certificate Sub-headers */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-blue-400">
                    SketchCast Interactive Masterclass Arena
                  </div>
                  <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-tight font-display">
                    Masterclass Pass of Merit
                  </h1>
                  <p className="text-xs text-zinc-400">
                    This official certificate verifies that attendee
                  </p>
                </div>

                {/* Recipient Full Name */}
                <div className="py-3 rounded-xl border border-white/[0.08] bg-[#0D0D10]">
                  <span className="text-xl sm:text-3xl font-bold tracking-tight text-white font-display">
                    {recipientName || 'Anonymous Participant'}
                  </span>
                </div>

                {/* Event Description */}
                <div className="space-y-1 max-w-lg mx-auto">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    has actively engaged in the live technical challenges, audience consensus, and architecture design session for
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-blue-400 font-display">
                    &ldquo;{roomTitle}&rdquo; (Room #{roomCode})
                  </p>
                </div>

                {/* Footer Credentials & Verifiable QR - Balanced Grid Layout */}
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

                    {/* Stat 3: Challenges Solved */}
                    <div className="p-2.5 rounded-xl bg-[#0E0E12] border border-white/[0.06] flex flex-col">
                      <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase">Challenges</span>
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        {correctQuizzes} Solved
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
                    <div className="col-span-2 pt-1 flex items-center justify-between flex-wrap gap-1 text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                      <span className="shrink-0">Issued: <strong className="text-zinc-400 font-normal">{issueDate}</strong></span>
                      <span className="truncate max-w-[170px] sm:max-w-none">ID: <strong className="text-zinc-400 font-normal">{certId.slice(0, 16)}...</strong></span>
                    </div>
                  </div>

                  {/* Verifiable QR Code matrix - Enlarged (100px) */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200 shadow-md shrink-0 self-center sm:self-auto">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={100}
                      level="M"
                      includeMargin={false}
                    />
                    <div className="mt-2 text-center leading-tight">
                      <div className="text-[11px] font-bold text-zinc-900 tracking-tight">Scan to Verify</div>
                      <div className="text-[9px] text-zinc-500 font-mono">ID: {certId.slice(-8)}</div>
                      <div className="text-[9px] font-semibold text-blue-600">SketchCast Live</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar - Single Prominent Download Pass Button */}
            <div className="p-4 bg-[#141418] border-t border-white/[0.08] flex items-center justify-center shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadPass}
                disabled={downloading}
                className="w-full sm:w-auto min-w-[220px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25 transition-all"
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

