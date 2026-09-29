import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChampionSocialCardData } from '../../types';
import { playClickSound } from '../../lib/soundFx';

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
  const [downloading, setDownloading] = useState(false);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // 1. Studio Noma Warm Paper Background
    ctx.fillStyle = '#F5F0E9';
    ctx.fillRect(0, 0, width, height);

    // 2. Tactile Subtle Grid Lines
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.05)';
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

    // 3. Precision Outer Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#101313';
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // 4. Header Bar
    ctx.fillStyle = '#EAE4DA';
    ctx.fillRect(20, 20, width - 40, 64);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#101313';
    ctx.strokeRect(20, 20, width - 40, 64);

    // Header Title
    ctx.fillStyle = '#101313';
    ctx.font = '800 20px "Manrope", sans-serif';
    const headerTitle = cardData.roomTitle
      ? `STUDIO NOMA • ${cardData.roomTitle.toUpperCase()}`
      : 'STUDIO NOMA • MASTERCLASS ARENA';
    const truncatedHeader = headerTitle.length > 42 ? headerTitle.slice(0, 40) + '...' : headerTitle;
    ctx.fillText(truncatedHeader, 44, 58);

    // Room Code Pill in Header
    ctx.fillStyle = '#101313';
    ctx.fillRect(width - 240, 32, 196, 40);
    ctx.strokeStyle = '#101313';
    ctx.strokeRect(width - 240, 32, 196, 40);
    ctx.fillStyle = '#D7FF2F';
    ctx.font = '700 16px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ROOM: ${cardData.roomCode}`, width - 142, 57);
    ctx.textAlign = 'left';

    // 5. Rank Badge & Trophy
    const isFirst = cardData.rank === 1;
    const isSecond = cardData.rank === 2;
    const isThird = cardData.rank === 3;
    const rankText = isFirst
      ? '#01 GOLD CHAMPION'
      : isSecond
      ? '#02 SILVER MEDALIST'
      : isThird
      ? '#03 BRONZE PODIUM'
      : `TOP PLAYER #${String(cardData.rank).padStart(2, '0')}`;

    ctx.fillStyle = '#FF6337';
    ctx.fillRect(44, 115, 340, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px "Manrope", sans-serif';
    ctx.fillText(rankText, 60, 143);

    // 6. Player Name (DM Serif Display style)
    ctx.fillStyle = '#101313';
    ctx.font = '700 52px "DM Serif Display", serif';
    const maxName =
      cardData.playerName.length > 22 ? cardData.playerName.slice(0, 20) + '..' : cardData.playerName;
    ctx.fillText(maxName, 44, 212);

    // Subtitle under Player Name
    ctx.fillStyle = '#65655F';
    ctx.font = '600 15px "Manrope", sans-serif';
    const subtitleText = cardData.roomTitle
      ? `${cardData.roomTitle} • Verified Realtime Arena Performance`
      : 'Interactive Architecture Mastery • Verified Realtime Performance';
    ctx.fillText(subtitleText, 44, 246);

    // 7. Stat Cards Grid (4 Stat Boxes)
    const effectiveScore =
      cardData.score ?? cardData.correctQuizzes * 100 + (cardData.pollsVoted || 0) * 25;
    const effectiveTotalAttendees = cardData.totalAttendees || 1;
    const effectiveHost = cardData.hostName
      ? cardData.hostName.length > 15
        ? cardData.hostName.slice(0, 13) + '..'
        : cardData.hostName
      : 'MASTERCLASS HOST';

    const stats = [
      {
        label: `RANK (OF ${effectiveTotalAttendees} PLAYERS)`,
        value: `#${String(cardData.rank).padStart(2, '0')}`,
      },
      {
        label: 'TOTAL SCORE',
        value: `${effectiveScore} PTS`,
      },
      {
        label: 'QUIZZES COMPLETED',
        value: `${cardData.correctQuizzes} SOLVED`,
      },
      {
        label: 'SESSION HOST',
        value: effectiveHost.toUpperCase(),
      },
    ];

    const boxWidth = 260;
    const boxHeight = 110;
    const boxStartX = 44;
    const boxStartY = 285;
    const gap = 24;

    stats.forEach((st, idx) => {
      const bx = boxStartX + idx * (boxWidth + gap);
      const by = boxStartY;

      // Box background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx, by, boxWidth, boxHeight);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#101313';
      ctx.strokeRect(bx, by, boxWidth, boxHeight);

      // Subtle top accent line
      ctx.fillStyle = idx === 0 ? '#FF6337' : idx === 1 ? '#D7FF2F' : '#101313';
      ctx.fillRect(bx, by, boxWidth, 4);

      // Value
      ctx.fillStyle = '#101313';
      ctx.font = '800 24px "DM Mono", monospace';
      ctx.fillText(st.value, bx + 18, by + 52);

      // Label
      ctx.fillStyle = '#65655F';
      ctx.font = '700 12px "Manrope", sans-serif';
      ctx.fillText(st.label, bx + 18, by + 84);
    });

    // 8. Divider Line
    ctx.strokeStyle = 'rgba(16, 19, 19, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(44, 535);
    ctx.lineTo(width - 44, 535);
    ctx.stroke();

    // 9. Clean Verified Footer
    ctx.fillStyle = '#65655F';
    ctx.font = '700 13px "Manrope", sans-serif';
    ctx.fillText('⚡ VERIFIED LIVE ARENA • STUDIO NOMA', 44, 575);

    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    ctx.textAlign = 'right';
    ctx.fillStyle = '#101313';
    ctx.font = '700 13px "DM Mono", monospace';
    ctx.fillText(`ISSUED: ${dateStr.toUpperCase()}`, width - 44, 575);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-md font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-paper text-ink w-[95vw] sm:max-w-2xl p-4 sm:p-6 border border-hairline rounded-3xl shadow-2xl relative font-sans max-h-[90dvh] overflow-y-auto"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 bg-paper text-muted hover:text-ink rounded-xl border border-hairline hover:border-ink transition-colors cursor-pointer z-10"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-2" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-start space-x-3 mb-5 pr-10">
              <div className="w-10 h-10 bg-orange/10 text-orange border border-orange/20 rounded-2xl flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-bold text-ink leading-tight font-display">
                    Export Champion Card
                  </h3>
                  <span className="px-2 py-0.5 bg-lime text-ink text-[10px] font-mono font-bold rounded-full border border-ink/20">
                    1200 × 630
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Ready-to-share graphic card for LinkedIn, X (Twitter), or developer portfolio
                </p>
              </div>
            </div>

            {/* Canvas Preview Container */}
            <div className="p-3 bg-paper-surface border border-hairline rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-auto aspect-1200/630 rounded-xl border border-hairline"
              />
            </div>

            {/* Primary Action Button: Download Champion Card */}
            <div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playClickSound();
                  handleDownloadPNG();
                }}
                disabled={downloading}
                className="w-full py-3.5 px-6 btn-noma-orange text-sm font-bold rounded-2xl flex items-center justify-center space-x-2.5 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{downloading ? 'Generating Champion Card...' : 'Download Champion Card'}</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
