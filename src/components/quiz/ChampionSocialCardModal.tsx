import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Copy, Check, Trophy, Share2, Smartphone, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChampionSocialCardData } from '../../types';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface ChampionSocialCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: ChampionSocialCardData;
}

export const ChampionSocialCardModal: React.FC<ChampionSocialCardModalProps> = ({
  isOpen,
  onClose,
  cardData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showShareToast, setShowShareToast] = useState<'linkedin' | 'twitter' | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // 1. Deep Background
    ctx.fillStyle = '#0E111B';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle Grid Matrix
    ctx.strokeStyle = '#181E2E';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Thick Outer Border
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(6, 6, width - 12, height - 12);

    // 4. Header Bar
    ctx.fillStyle = '#1A1E2C';
    ctx.fillRect(12, 12, width - 24, 70);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(12, 12, width - 24, 70);

    // Header Title
    ctx.fillStyle = '#FFE600';
    ctx.font = '900 24px "Inter", "Outfit", sans-serif';
    ctx.fillText('⚡ SKETCHCAST LIVE 2.0 // ARENA CHAMPIONSHIP', 36, 56);

    // Room Code Pill in Header
    ctx.fillStyle = '#000000';
    ctx.fillRect(width - 240, 24, 200, 44);
    ctx.fillStyle = '#00F59B';
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ROOM: ${cardData.roomCode}`, width - 140, 52);
    ctx.textAlign = 'left';

    // 5. Rank Badge & Trophy
    const isFirst = cardData.rank === 1;
    const isSecond = cardData.rank === 2;
    const isThird = cardData.rank === 3;
    const rankColor = isFirst ? '#FFE600' : isSecond ? '#00F0FF' : isThird ? '#FF8833' : '#9B5DE5';
    const rankText = isFirst ? '#1 GOLD CHAMPION' : isSecond ? '#2 SILVER MEDALIST' : isThird ? '#3 BRONZE PODIUM' : `TOP PLAYER #${cardData.rank}`;

    ctx.fillStyle = rankColor;
    ctx.fillRect(40, 115, 340, 48);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(40, 115, 340, 48);

    ctx.fillStyle = '#000000';
    ctx.font = '900 20px "JetBrains Mono", monospace';
    ctx.fillText(rankText, 56, 146);

    // 6. Player Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 52px "Inter", "Outfit", sans-serif';
    const maxName = cardData.playerName.length > 22 ? cardData.playerName.slice(0, 20) + '..' : cardData.playerName;
    ctx.fillText(maxName.toUpperCase(), 40, 220);

    // 7. Stat Cards Grid (2 Stat Boxes)
    const stats = [
      { label: 'QUIZZES SOLVED', value: `${cardData.correctQuizzes} / ${cardData.totalQuizzes || cardData.correctQuizzes}`, color: '#00F59B' },
      { label: 'POLLS PARTICIPATED', value: `${cardData.pollsVoted} VOTES`, color: '#00F0FF' },
    ];

    const boxWidth = 320;
    const boxHeight = 110;
    const boxStartX = 40;
    const boxStartY = 280;
    const gap = 32;

    stats.forEach((st, idx) => {
      const bx = boxStartX + idx * (boxWidth + gap);
      const by = boxStartY;

      // Box background
      ctx.fillStyle = '#151824';
      ctx.fillRect(bx, by, boxWidth, boxHeight);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(bx, by, boxWidth, boxHeight);

      // Value
      ctx.fillStyle = st.color;
      ctx.font = '900 32px "JetBrains Mono", monospace';
      ctx.fillText(st.value, bx + 24, by + 56);

      // Label
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(st.label, bx + 24, by + 90);
    });

    // 9. Footer Watermark
    ctx.fillStyle = '#64748B';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('Verified Realtime Keynote Session • Powered by SketchCast Live & Supabase', 40, 580);

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.textAlign = 'right';
    ctx.fillText(`ISSUED: ${dateStr.toUpperCase()}`, width - 40, 580);
    ctx.textAlign = 'left';
  }, [cardData]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawCard, 50);
    }
  }, [isOpen, drawCard]);

  if (!isOpen) return null;

  const getCardBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleDownloadPNG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const blob = await getCardBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `sketchcast-champion-${cardData.playerName.toLowerCase().replace(/\s+/g, '_')}.png`;
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
    const canvas = canvasRef.current;
    if (!canvas || !navigator.clipboard?.write) return false;

    try {
      const blob = await getCardBlob();
      if (!blob) return false;
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      handleDownloadPNG();
      return false;
    }
  };

  const handleShare = async (platform: 'linkedin' | 'twitter' | 'native') => {
    playClickSound();
    const filename = `sketchcast-champion-${cardData.playerName.toLowerCase().replace(/\s+/g, '_')}.png`;
    const shareTitle = `SketchCast Champion: ${cardData.playerName}`;
    const shareText = `🏆 Answered ${cardData.correctQuizzes} correctly (Rank #${cardData.rank}) on SketchCast Live Keynote Arena in Room #${cardData.roomCode}! ⚡ Realtime architecture mastery unlocked.\nJoin the interactive arena: ${window.location.origin}`;

    // 1. Explicit Native OS Share Sheet (only when user clicks 'SHARE CARD')
    if (platform === 'native') {
      const blob = await getCardBlob();
      const file = blob
        ? new File([blob], filename, { type: 'image/png' })
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
          if (err?.name === 'AbortError') return;
        }
      }
      await handleDownloadPNG();
      return;
    }

    // 2. Direct Social Platform Web Intents - ALWAYS opens website directly without OS popup
    if (platform === 'linkedin') {
      const textParam = encodeURIComponent(shareText);
      window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${textParam}`, '_blank');
    } else if (platform === 'twitter') {
      const textParam = encodeURIComponent(
        `🏆 Answered ${cardData.correctQuizzes} correctly (#${cardData.rank}) on @SketchCast Live Keynote Arena in Room #${cardData.roomCode}! ⚡ Interactive architecture challenge completed: ${window.location.origin}`
      );
      window.open(`https://twitter.com/intent/tweet?text=${textParam}`, '_blank');
    }

    // 3. Desktop Flow: Concurrently copy image to clipboard and trigger PNG download for easy Ctrl+V pasting
    getCardBlob().then(async (blob) => {
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
            className="bg-neo-cream text-black w-full max-w-2xl p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[95vh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-2.5 sm:space-x-3 mb-3.5 sm:mb-4 pr-8 sm:pr-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neo-yellow text-black border-2 border-black brutal-shadow-sm flex items-center justify-center font-heavy shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-heavy uppercase tracking-tight text-black leading-tight">
                    EXPORT CHAMPION SOCIAL CARD
                  </h3>
                  <span className="px-1.5 py-0.2 bg-black text-neo-mint font-mono text-[9px] font-black uppercase border border-black">
                    HIGH RES 1200x630
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-mono text-slate-700 mt-0.5">
                  Ready-to-share graphic card for your LinkedIn, X (Twitter), or developer portfolio!
                </p>
              </div>
            </div>

            {/* Desktop Share Guidance Toast */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3.5 p-2.5 sm:p-3 bg-neo-yellow text-black border-2 border-black font-mono text-xs font-bold flex items-center justify-between brutal-shadow shrink-0"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-black" />
                    <span className="leading-tight">
                      <strong>Card Image Copied & Downloaded!</strong> Press{' '}
                      <kbd className="px-1 py-0.5 bg-black text-neo-yellow border border-black text-[10px] font-black">
                        Ctrl+V
                      </kbd>{' '}
                      to paste the graphic card directly into your {showShareToast === 'linkedin' ? 'LinkedIn' : 'X'} post.
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

            {/* Canvas Preview Container */}
            <div className="p-2 sm:p-3 bg-[#0B0D14] border-2 border-black brutal-shadow-sm mb-4 flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-auto aspect-1200/630 border border-slate-800 brutal-shadow-sm"
              />
            </div>

            {/* 1-Click Action Buttons */}
            <div className="space-y-2 font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playClickSound();
                    handleDownloadPNG();
                  }}
                  disabled={downloading}
                  className="py-2.5 px-4 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'GENERATING PNG...' : '📥 DOWNLOAD PNG IMAGE'}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    playPopSound();
                    handleCopyImage();
                  }}
                  className={`py-2.5 px-4 text-xs font-black uppercase border-2 border-black brutal-shadow flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                    copied ? 'bg-neo-mint text-black' : 'bg-neo-cyan hover:bg-[#33F3FF] text-black'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4 stroke-3" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'IMAGE COPIED TO CLIPBOARD!' : '📋 COPY IMAGE TO CLIPBOARD'}</span>
                </motion.button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {canNativeShare && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleShare('native')}
                    className="py-2.5 px-3 bg-neo-mint hover:bg-[#00E58D] text-black border-2 border-black text-[11px] font-black uppercase flex items-center justify-center space-x-1.5 transition-all cursor-pointer brutal-shadow-sm col-span-1 sm:col-span-2 md:col-span-1"
                    title="Share with Graphic Card via Native Apps"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>📱 SHARE CARD</span>
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleShare('twitter')}
                  className="py-2.5 px-3 bg-black hover:bg-slate-900 text-white border-2 border-black text-[11px] font-black uppercase flex items-center justify-center space-x-1.5 transition-all cursor-pointer brutal-shadow-sm"
                  title="Share on X (Twitter) with Champion Card"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>🐦 SHARE ON X</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleShare('linkedin')}
                  className="py-2.5 px-3 bg-[#0077B5] hover:bg-[#006396] text-white border-2 border-black text-[11px] font-black uppercase flex items-center justify-center space-x-1.5 transition-all cursor-pointer brutal-shadow-sm"
                  title="Share on LinkedIn with Champion Card"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>💼 SHARE ON LINKEDIN</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
