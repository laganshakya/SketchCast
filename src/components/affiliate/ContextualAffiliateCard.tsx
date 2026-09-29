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

  if (variant === 'compact') {
    return (
      <div className={`mt-3 ${className}`}>
        <a
          href={recommendation.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleCardClick}
          className="p-3.5 rounded-2xl border border-hairline bg-paper-surface hover:bg-paper flex items-center justify-between gap-3 text-left transition-all shadow-2xs group block"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-paper border border-hairline text-ink shrink-0">
              <IconComponent className="w-4 h-4 text-ink" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  {recommendation.provider}
                </span>
                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase bg-lime text-ink border border-ink/15 shadow-2xs">
                  {recommendation.badgeText}
                </span>
              </div>
              <div className="text-xs font-bold text-ink group-hover:text-orange transition-colors truncate mt-0.5">
                {recommendation.title}
              </div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted group-hover:text-ink shrink-0 transition-colors" />
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
        className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-hairline bg-paper-surface shadow-xs transition-all relative overflow-hidden"
      >
        {/* Top Metadata Bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap text-[10px] font-mono">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-paper border border-hairline text-ink">
              <IconComponent className="w-3.5 h-3.5 text-ink" />
            </div>
            <span className="font-bold tracking-wider uppercase text-muted truncate">
              {recommendation.isCustomSponsor ? 'SPONSORED COHORT' : `${recommendation.provider} LEARNING PATH`}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-lime text-ink border border-ink/15 shadow-2xs">
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
              className="text-muted hover:text-ink flex items-center gap-1 cursor-pointer transition-colors text-[9px] font-mono uppercase tracking-wider"
              title="Affiliate Transparency Disclosure"
            >
              <span>PARTNER</span>
              <Info className="w-3 h-3 text-muted" />
            </button>

            <AnimatePresence>
              {showDisclosure && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 bottom-full mb-1.5 w-60 p-3 rounded-2xl bg-paper border border-hairline text-ink text-[11px] font-sans shadow-xl z-20 leading-relaxed"
                >
                  Curated partner recommendation. SketchCast may earn an affiliate commission at zero extra cost to you.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Contextual Framing Note */}
        {recommendation.dynamicContextNote && (
          <div className="text-[11px] font-mono text-muted mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse shrink-0" />
            <span className="truncate">{recommendation.dynamicContextNote}</span>
          </div>
        )}

        {/* Headline & Title */}
        <h4 className="text-sm sm:text-base font-bold text-ink font-serif tracking-tight leading-snug">
          {recommendation.headline}
        </h4>
        {recommendation.description && (
          <p className="text-xs text-muted mt-1 font-sans leading-relaxed line-clamp-2">
            {recommendation.description}
          </p>
        )}

        {/* Action Controls Footer */}
        <div className="mt-3.5 pt-3 border-t border-hairline flex items-center justify-between flex-wrap gap-2">
          {/* Discount Code Pill (if available) */}
          {recommendation.discountCode ? (
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1.5 rounded-xl bg-paper hover:bg-paper-surface border border-hairline text-[10px] font-mono font-bold text-ink flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Click to copy promo code"
            >
              <Tag className="w-3 h-3 text-orange" />
              <span>CODE: <span className="text-ink font-extrabold">{recommendation.discountCode}</span></span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
              ) : (
                <Copy className="w-3 h-3 text-muted ml-0.5" />
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono text-muted uppercase">
              Official Syllabus & Guide
            </span>
          )}

          {/* Primary Action Button */}
          <a
            href={recommendation.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleCardClick}
            className="btn-noma-orange px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Explore Track</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
