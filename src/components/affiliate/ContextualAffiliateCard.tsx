import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Tag,
  Copy,
  Check,
  Sparkles,
  Cloud,
  Code,
  Layers,
  Database,
  ShieldCheck,
  BookOpen,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ResolvedAffiliateCardData } from '../../types';
import { dbRecordAffiliateClick, dbRecordAffiliateImpression } from '../../lib/supabase';
import { playClickSound, playPopSound } from '../../lib/soundFx';

interface ContextualAffiliateCardProps {
  recommendation: ResolvedAffiliateCardData | null;
  className?: string;
  variant?: 'card' | 'compact' | 'banner';
}

const ICON_MAP: Record<string, React.ElementType> = {
  Cloud,
  Code,
  Layers,
  Database,
  ShieldCheck,
  Sparkles,
  BookOpen,
};

export const ContextualAffiliateCard: React.FC<ContextualAffiliateCardProps> = ({
  recommendation,
  className = '',
  variant = 'card',
}) => {
  const [copied, setCopied] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    if (recommendation?.id) {
      dbRecordAffiliateImpression(recommendation.id);
    }
  }, [recommendation?.id]);

  if (!recommendation) return null;

  const IconComponent = (recommendation.iconKey && ICON_MAP[recommendation.iconKey]) || BookOpen;

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!recommendation.discountCode) return;
    playPopSound();
    navigator.clipboard.writeText(recommendation.discountCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCardClick = () => {
    playClickSound();
    dbRecordAffiliateClick(recommendation.id);
  };

  // Color theme mapping
  const colorThemes = {
    blue: {
      border: 'border-blue-500/30 hover:border-blue-500/50',
      bg: 'bg-gradient-to-r from-blue-950/25 via-[#121216] to-[#121216]',
      accent: 'text-blue-400',
      pillBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      bg: 'bg-gradient-to-r from-purple-950/25 via-[#121216] to-[#121216]',
      accent: 'text-purple-400',
      pillBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.08)]',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      bg: 'bg-gradient-to-r from-amber-950/25 via-[#121216] to-[#121216]',
      accent: 'text-amber-400',
      pillBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      bg: 'bg-gradient-to-r from-emerald-950/25 via-[#121216] to-[#121216]',
      accent: 'text-emerald-400',
      pillBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    },
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      bg: 'bg-gradient-to-r from-rose-950/25 via-[#121216] to-[#121216]',
      accent: 'text-rose-400',
      pillBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
    },
  };

  const theme = colorThemes[recommendation.themeColor] || colorThemes.blue;

  if (variant === 'compact') {
    return (
      <div className={`mt-3 ${className}`}>
        <a
          href={recommendation.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleCardClick}
          className={`p-3 rounded-xl border ${theme.border} ${theme.bg} ${theme.glow} flex items-center justify-between gap-3 text-left transition-all hover:scale-[1.008] group block`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] ${theme.accent} shrink-0`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {recommendation.provider}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-extrabold uppercase border ${theme.pillBg}`}>
                  {recommendation.badgeText}
                </span>
              </div>
              <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors truncate mt-0.5 font-display">
                {recommendation.title}
              </div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 shrink-0 transition-colors" />
        </a>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`mt-3 relative ${className}`}
    >
      <div
        className={`p-3.5 sm:p-4 rounded-xl border ${theme.border} ${theme.bg} ${theme.glow} transition-all relative overflow-hidden`}
      >
        {/* Subtle Top Metadata Bar */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap text-[10px] font-mono">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`p-1 rounded-md bg-white/[0.04] border border-white/[0.08] ${theme.accent}`}>
              <IconComponent className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold tracking-wider uppercase text-zinc-300 truncate">
              {recommendation.isCustomSponsor ? 'SPONSORED COHORT' : `${recommendation.provider} LEARNING PATH`}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${theme.pillBg}`}>
              {recommendation.badgeText}
            </span>
          </div>

          {/* FTC Partner Disclosure Info Tooltip */}
          <div className="relative flex items-center">
            <button
              type="button"
              onMouseEnter={() => setShowDisclosure(true)}
              onMouseLeave={() => setShowDisclosure(false)}
              onClick={() => setShowDisclosure(!showDisclosure)}
              className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors text-[9px] uppercase tracking-wider"
              title="Affiliate Transparency Disclosure"
            >
              <span>PARTNER</span>
              <Info className="w-3 h-3 text-zinc-500" />
            </button>

            <AnimatePresence>
              {showDisclosure && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 bottom-full mb-1.5 w-56 p-2 rounded-lg bg-[#18181D] border border-white/[0.1] text-zinc-300 text-[10px] font-sans shadow-xl z-20 leading-relaxed"
                >
                  Curated partner recommendation. SketchCast may earn an affiliate commission at zero extra cost to you.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Contextual Framing Note */}
        {recommendation.dynamicContextNote && (
          <div className="text-[11px] font-mono text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="truncate">{recommendation.dynamicContextNote}</span>
          </div>
        )}

        {/* Headline & Title */}
        <h4 className="text-xs sm:text-sm font-bold text-white font-display tracking-tight leading-snug">
          {recommendation.headline}
        </h4>
        {recommendation.description && (
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 font-sans leading-relaxed line-clamp-2">
            {recommendation.description}
          </p>
        )}

        {/* Action Controls Footer */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          {/* Discount Code Pill (if available) */}
          {recommendation.discountCode ? (
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Click to copy promo code"
            >
              <Tag className="w-3 h-3 text-amber-400" />
              <span>CODE: <span className="text-amber-300 font-extrabold">{recommendation.discountCode}</span></span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-400 ml-0.5" />
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              Official Syllabus & Guide
            </span>
          )}

          {/* Primary Action Button */}
          <a
            href={recommendation.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleCardClick}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            <span>Explore Track</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
