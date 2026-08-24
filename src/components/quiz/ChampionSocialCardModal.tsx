import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Copy, Check, Trophy } from 'lucide-react';
import type { ChampionSocialCardData } from '../../types';

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

    // 7. Stat Cards Grid (4 Stat Boxes)
    const stats = [
      { label: 'FINAL SCORE', value: `${cardData.score} PTS`, color: '#FFE600' },
      { label: 'QUIZZES SOLVED', value: `${cardData.correctQuizzes} / ${cardData.totalQuizzes || cardData.correctQuizzes}`, color: '#00F59B' },
      { label: 'MAX STREAK', value: `${cardData.maxStreak}X COMBO`, color: '#FF8833' },
      { label: 'POLLS PARTICIPATED', value: `${cardData.pollsVoted} VOTES`, color: '#00F0FF' },
    ];

    const boxWidth = 260;
    const boxHeight = 110;
    const boxStartX = 40;
    const boxStartY = 260;
    const gap = 24;

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
      ctx.font = '900 28px "JetBrains Mono", monospace';
      ctx.fillText(st.value, bx + 16, by + 50);

      // Label
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(st.label, bx + 16, by + 86);
    });

    // 8. Badges Banner Row
    ctx.fillStyle = '#1C202E';
    ctx.fillRect(40, 400, width - 80, 110);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(40, 400, width - 80, 110);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('UNLOCKED ACHIEVEMENTS & BADGES:', 56, 430);

    const badgeList = cardData.badges.length > 0 ? cardData.badges : [
      { icon: '⚡', name: 'Speed Demon', desc: 'Fast answers' },
      { icon: '🔥', name: 'On Fire', desc: '3x Streak' },
      { icon: '👑', name: 'Podium Champ', desc: 'Top 3' },
      { icon: '🗳️', name: 'Democracy Hero', desc: 'Active Voter' },
    ];

    badgeList.slice(0, 4).forEach((b, idx) => {
      const bbx = 56 + idx * 270;
      const bby = 445;

      const rarityColor =
        b.rarity === 'legendary'
          ? '#FFE600'
          : b.rarity === 'epic'
          ? '#FF2A6D'
          : b.rarity === 'rare'
          ? '#00F0FF'
          : '#475569';

      ctx.fillStyle = '#0F111A';
      ctx.fillRect(bbx, bby, 250, 48);
      ctx.lineWidth = 2;
      ctx.strokeStyle = rarityColor;
      ctx.strokeRect(bbx, bby, 250, 48);

      ctx.font = '20px sans-serif';
      ctx.fillText(b.icon, bbx + 10, bby + 32);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(b.name, bbx + 42, bby + 26);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(b.desc, bbx + 42, bby + 40);
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

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `sketchcast-champion-${cardData.playerName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.clipboard) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Fallback if clipboard write fails
          handleDownloadPNG();
        }
      }, 'image/png');
    } catch {
      handleDownloadPNG();
    }
  };

  const shareText = `🏆 Just scored ${cardData.score} PTS on @SketchCast Live Keynote Arena! (#${cardData.rank} on Room ${cardData.roomCode})`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="bg-neo-cream text-black w-full max-w-2xl p-4 sm:p-6 border-4 border-black brutal-shadow-lg relative font-sans max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1 sm:p-1.5 bg-black text-white hover:bg-neo-pink transition-colors border-2 border-black cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-3" />
        </button>

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
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="py-2.5 px-4 bg-neo-yellow hover:bg-[#FFF04D] text-black text-xs font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'GENERATING PNG...' : '📥 DOWNLOAD PNG IMAGE'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className={`py-2.5 px-4 text-xs font-black uppercase border-2 border-black brutal-shadow active:translate-x-px active:translate-y-px active:shadow-none flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                copied ? 'bg-neo-mint text-black' : 'bg-neo-cyan hover:bg-[#33F3FF] text-black'
              }`}
            >
              {copied ? <Check className="w-4 h-4 stroke-3" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'IMAGE COPIED TO CLIPBOARD!' : '📋 COPY IMAGE TO CLIPBOARD'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-[#1A1E2B] hover:bg-[#252B3D] text-slate-200 border-2 border-black text-[11px] font-bold uppercase flex items-center justify-center space-x-1.5 transition-all text-center"
            >
              <span>🐦 SHARE ON X (TWITTER)</span>
            </a>

            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-[#1A1E2B] hover:bg-[#252B3D] text-slate-200 border-2 border-black text-[11px] font-bold uppercase flex items-center justify-center space-x-1.5 transition-all text-center"
            >
              <span>💼 SHARE ON LINKEDIN</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
