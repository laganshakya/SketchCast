import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  Award,
  Share2,
  Check,
  ExternalLink,
  Sparkles,
  Trophy,
  ShieldCheck,
  Printer,
  Download,
  Copy,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showShareToast, setShowShareToast] = useState<'linkedin' | 'twitter' | null>(null);

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
    ? `${window.location.origin}/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&score=${score}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}`
    : `https://sketchcast.live/?verify_cert=${certId}&room=${encodeURIComponent(roomCode)}&score=${score}&name=${encodeURIComponent(recipientName)}&title=${encodeURIComponent(roomTitle)}&rank=${rank}&total=${totalAttendees}`;

  // Check if device supports native Web Share API
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Draw high-resolution 1200x700 Certificate Card on Canvas
  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 700;

    // 1. Background (Dark Cyber Neo-Brutalist)
    ctx.fillStyle = '#0A0C14';
    ctx.fillRect(0, 0, width, height);

    // 2. Dot Matrix Pattern
    ctx.fillStyle = '#1E2538';
    for (let x = 24; x < width - 24; x += 24) {
      for (let y = 24; y < height - 24; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Neo-Brutalist Chunky Yellow Outer Border
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFE600';
    ctx.strokeRect(5, 5, width - 10, height - 10);

    // Inner subtle border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22283A';
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 4. Corner Accreditation Badges
    // Top-Left Acc-No Stamp
    ctx.fillStyle = '#FF2A6D';
    ctx.fillRect(30, 30, 160, 26);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(30, 30, 160, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ACC-NO: ${certId.slice(-8)}`, 110, 47);

    // Top-Right Verified Stamp
    ctx.fillStyle = '#00F59B';
    ctx.fillRect(width - 230, 30, 200, 26);
    ctx.strokeRect(width - 230, 30, 200, 26);
    ctx.fillStyle = '#000000';
    ctx.fillText('🛡️ VERIFIED ARCHITECTURE', width - 130, 47);

    // 5. Golden Seal (Center Icon Box)
    ctx.save();
    ctx.translate(width / 2, 92);
    ctx.rotate(-0.025);
    ctx.fillStyle = '#FFE600';
    ctx.fillRect(-28, -28, 56, 56);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(-28, -28, 56, 56);
    ctx.font = '30px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 0, 10);
    ctx.restore();

    // 6. Certificate Title & Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE600';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('SKETCHCAST INTERACTIVE ARCHITECTURE ARENA', width / 2, 162);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px "Space Grotesk", sans-serif';
    ctx.fillText('MASTERCLASS PASS OF MERIT', width / 2, 205);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('This official certificate verifies that attendee', width / 2, 235);

    // 7. Recipient Name Banner Box
    const bannerY = 255;
    ctx.fillStyle = '#05070B';
    ctx.fillRect(160, bannerY, width - 320, 64);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFE600';
    ctx.strokeRect(160, bannerY, width - 320, 64);

    ctx.fillStyle = '#FFE600';
    ctx.font = '900 36px "Space Grotesk", sans-serif';
    ctx.fillText((recipientName || 'ANONYMOUS ARCHITECT').toUpperCase(), width / 2, bannerY + 44);

    // 8. Event Description & Room
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '13px "Space Grotesk", sans-serif';
    ctx.fillText(
      'has actively engaged in the live technical challenges, audience consensus, and architecture design session for',
      width / 2,
      348
    );

    ctx.fillStyle = '#00F59B';
    ctx.font = '900 17px "Space Grotesk", sans-serif';
    ctx.fillText(`"${roomTitle.toUpperCase()}" (ROOM #${roomCode.toUpperCase()})`, width / 2, 376);

    // 9. Badges Ribbon
    if (badges.length > 0) {
      const badgeY = 406;
      ctx.fillStyle = '#10131E';
      ctx.fillRect(160, badgeY, width - 320, 50);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(160, badgeY, width - 320, 50);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText('ACCREDITED BADGES EARNED IN SESSION', width / 2, badgeY + 16);

      const displayBadges = badges.slice(0, 4);
      const totalWidth = displayBadges.length * 160;
      let startX = (width - totalWidth) / 2;

      displayBadges.forEach((b) => {
        ctx.fillStyle = '#1B2032';
        ctx.fillRect(startX, badgeY + 22, 150, 22);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#384260';
        ctx.strokeRect(startX, badgeY + 22, 150, 22);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${b.icon} ${b.name.toUpperCase()}`, startX + 75, badgeY + 37);
        startX += 160;
      });
    }

    // 10. Footer Details Grid
    const footerY = 485;
    ctx.textAlign = 'left';

    // Left Details Column
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('FINAL SCORE:', 70, footerY + 28);
    ctx.fillStyle = '#FFE600';
    ctx.font = '900 24px "JetBrains Mono", monospace';
    ctx.fillText(`${score} PTS`, 190, footerY + 30);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('SESSION RANK:', 70, footerY + 65);
    ctx.fillStyle = '#33F3FF';
    ctx.font = '900 15px "JetBrains Mono", monospace';
    ctx.fillText(`RANK #${rank} OF ${totalAttendees} ATTENDEES`, 190, footerY + 65);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('ISSUED ON:', 70, footerY + 100);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(issueDate.toUpperCase(), 190, footerY + 100);

    ctx.fillStyle = '#475569';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`CERTIFICATE ID: ${certId}`, 70, footerY + 130);

    // Right QR Code Box
    const qrCanvas = qrContainerRef.current?.querySelector('canvas');
    if (qrCanvas) {
      const qx = width - 260;
      const qy = footerY + 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qx, qy, 190, 130);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(qx, qy, 190, 130);

      // Draw QR Code
      ctx.drawImage(qrCanvas, qx + 12, qy + 15, 95, 95);

      // QR label
      ctx.fillStyle = '#000000';
      ctx.font = '900 10px "JetBrains Mono", monospace';
      ctx.fillText('SCAN TO VERIFY', qx + 115, qy + 40);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillText('SKETCHCAST', qx + 115, qy + 60);
      ctx.fillText('AUTHENTIC', qx + 115, qy + 75);
      ctx.fillText(certId.slice(0, 10), qx + 115, qy + 90);
    }

    // 11. Bottom Platform Watermark
    ctx.fillStyle = '#475569';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Verified Realtime Keynote Session • Powered by SketchCast Live & Supabase', width / 2, height - 16);
  }, [certId, recipientName, roomCode, roomTitle, score, rank, totalAttendees, badges, issueDate]);

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
            colors: ['#FFE600', '#00F59B', '#FF4782', '#33F3FF', '#FFFFFF'],
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

  const handleCopyLink = () => {
    playPopSound();
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPNG = async () => {
    playPopSound();
    setDownloading(true);
    try {
      const blob = await getCertificateBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `sketchcast-certificate-${recipientName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleCopyImage = async (): Promise<boolean> => {
    playPopSound();
    try {
      const blob = await getCertificateBlob();
      if (!blob || !navigator.clipboard?.write) return false;
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2500);
      return true;
    } catch {
      return false;
    }
  };

  const handleShare = async (platform: 'linkedin' | 'twitter' | 'native') => {
    playClickSound();
    const shareTitle = `SketchCast Masterclass Pass: ${roomTitle}`;
    const shareText = `🎓 Proud to complete the "${roomTitle}" live technical masterclass on SketchCast!\nScored ${score} PTS (Rank #${rank}) and earned verifiable achievement badges.\nVerify credential: ${verificationUrl}`;
    const filename = `sketchcast-certificate-${recipientName.toLowerCase().replace(/\s+/g, '_')}.png`;

    // 1. Explicit Native OS Share Sheet (only when user clicks 'SHARE PASS')
    if (platform === 'native') {
      const blob = await getCertificateBlob();
      const file = blob
        ? new File([blob], filename, {
            type: 'image/png',
          })
        : null;

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: file && navigator.canShare?.({ files: [file] }) ? [file] : undefined,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // User simply closed the share sheet
        }
      }
      // If native share isn't supported or fails, fallback to downloading PNG
      await handleDownloadPNG();
      return;
    }

    // 2. Direct Social Platform Web Intents - ALWAYS opens website directly without OS popup
    if (platform === 'linkedin') {
      const textParam = encodeURIComponent(shareText);
      window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${textParam}`, '_blank');
    } else if (platform === 'twitter') {
      const textParam = encodeURIComponent(
        `Just mastered the live architecture challenges in "${roomTitle}" on @SketchCast! ⚡ Scored ${score} PTS (Rank #${rank}). Check my verifiable pass: ${verificationUrl}`
      );
      window.open(`https://twitter.com/intent/tweet?text=${textParam}`, '_blank');
    }

    // 3. Desktop Flow: Concurrently copy image to clipboard and trigger PNG download for easy Ctrl+V pasting
    getCertificateBlob().then(async (blob) => {
      if (blob) {
        await handleCopyImage();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });

    setShowShareToast(platform);
    setTimeout(() => setShowShareToast(null), 8000);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto font-sans"
        >
          {/* Hidden Canvas Elements for High-Res PNG Generation & QR Drawing */}
          <canvas ref={canvasRef} width={1200} height={700} className="hidden" />
          <div ref={qrContainerRef} className="hidden">
            <QRCodeCanvas value={verificationUrl} size={100} level="M" includeMargin={false} />
          </div>

          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="w-full max-w-2xl bg-[#0D0F17] border-4 border-black brutal-shadow-lg text-white my-auto overflow-hidden flex flex-col relative"
          >
            {/* Modal Header Bar */}
            <div className="p-3 sm:p-4 bg-neo-yellow text-black border-b-4 border-black flex items-center justify-between shrink-0">
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

            {/* Desktop Share Guidance Toast */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2.5 sm:p-3 bg-neo-yellow text-black border-b-3 border-black font-mono text-xs font-bold flex items-center justify-between brutal-shadow z-20 shrink-0"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-black" />
                    <span className="leading-tight">
                      <strong>Certificate Image Copied & Downloaded!</strong> Press{' '}
                      <kbd className="px-1 py-0.5 bg-black text-neo-yellow border border-black text-[10px] font-black">
                        Ctrl+V
                      </kbd>{' '}
                      to paste the graphic pass directly into your {showShareToast === 'linkedin' ? 'LinkedIn' : 'X'} post.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowShareToast(null)}
                    className="p-1 hover:bg-black hover:text-white border border-black cursor-pointer ml-2 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Neo-Brutalist Certificate Card Printable View */}
            <div className="p-3 sm:p-6 bg-[#121420] overflow-y-auto max-h-[66vh]">
              <div
                ref={certCardRef}
                className="relative bg-[#0A0C14] border-4 border-black p-4 sm:p-8 brutal-shadow-yellow text-center space-y-4 sm:space-y-5 overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(#2A3048 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Decorative Corner Stamps */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-neo-pink text-white font-mono text-[9px] font-black uppercase border border-black">
                  ACC-NO: {certId.slice(-8)}
                </div>
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-neo-mint text-black font-mono text-[9px] font-black uppercase border border-black flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VERIFIED LIVE</span>
                </div>

                {/* Issuer Seal */}
                <div className="pt-2 sm:pt-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-neo-yellow text-black border-3 border-black brutal-shadow-sm -rotate-2">
                    <Trophy className="w-7 h-7 sm:w-8 sm:h-8 fill-black" />
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
                  <span className="text-xl sm:text-3xl md:text-4xl font-heavy uppercase tracking-wider text-neo-yellow font-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
                <div className="pt-3 sm:pt-4 border-t-2 border-black flex items-center justify-between flex-wrap gap-3 sm:gap-4 text-left">
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
                  <div className="flex items-center gap-2.5 bg-white p-2 border-2 border-black brutal-shadow-sm shrink-0">
                    <QRCodeSVG
                      value={verificationUrl}
                      size={68}
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
            <div className="p-3 sm:p-4 bg-neo-card border-t-4 border-black flex items-center justify-between flex-wrap gap-2 font-mono shrink-0">
              {/* Left Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDownloadPNG}
                  disabled={downloading}
                  className="px-2.5 sm:px-3 py-1.5 bg-neo-yellow hover:bg-[#FFE600] text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Download High-Resolution PNG Pass"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'GENERATING...' : 'DOWNLOAD PNG'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCopyImage}
                  className={`px-2.5 sm:px-3 py-1.5 text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer ${
                    copiedImage ? 'bg-neo-mint' : 'bg-neo-cyan hover:bg-[#33F3FF]'
                  }`}
                  title="Copy Certificate Image to Clipboard"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 stroke-3" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedImage ? 'IMAGE COPIED!' : 'COPY IMAGE'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCopyLink}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#1B2030] hover:bg-[#252C42] text-slate-200 font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Copy Verifiable Pass Web Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-neo-mint" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'LINK COPIED!' : 'COPY LINK'}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePrint}
                  className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-[#1B2030] hover:bg-[#252C42] text-slate-300 font-black text-xs uppercase border-2 border-black brutal-shadow-sm items-center gap-1.5 cursor-pointer"
                  title="Print / Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT</span>
                </motion.button>
              </div>

              {/* Right Social Sharing Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Mobile / Tablet Direct Share Button */}
                {canNativeShare && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare('native')}
                    className="px-2.5 sm:px-3 py-1.5 bg-neo-mint hover:bg-[#00E58D] text-black font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Share with Image via Native Apps"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>SHARE PASS</span>
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare('linkedin')}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#0077B5] hover:bg-[#006396] text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Share on LinkedIn with Certificate Pass"
                >
                  <Share2 className="w-3 h-3" />
                  <span>LINKEDIN</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleShare('twitter')}
                  className="px-2.5 sm:px-3 py-1.5 bg-black hover:bg-slate-900 text-white font-black text-xs uppercase border-2 border-black brutal-shadow-sm flex items-center gap-1 cursor-pointer"
                  title="Share on X (Twitter)"
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
