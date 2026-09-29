import { useState, useEffect, useMemo } from 'react';
import type {
  AffiliatePlacement,
  AffiliateRecommendation,
  QuizQuestion,
  ResolvedAffiliateCardData,
  SponsorCTA,
} from '../types';
import { dbFetchAffiliateRecommendations } from '../lib/supabase';
import { matchAffiliateRecommendation } from '../lib/affiliate/affiliateEngine';

interface UseAffiliateOptions {
  placement: AffiliatePlacement;
  question?: QuizQuestion | null;
  accuracyPct?: number | null;
  accuracyRate?: number | null;
  contextKeywords?: string[];
  roomTitle?: string;
  roomTopic?: string;
  roomCode?: string;
  sponsorCTA?: SponsorCTA | null;
}

export function useAffiliateRecommendation({
  placement,
  question,
  accuracyPct,
  accuracyRate,
  contextKeywords,
  roomTitle,
  roomTopic,
  roomCode,
  sponsorCTA,
}: UseAffiliateOptions): ResolvedAffiliateCardData | null {
  const [catalog, setCatalog] = useState<AffiliateRecommendation[]>([]);

  // Sync fresh catalog from Supabase
  useEffect(() => {
    let isMounted = true;
    dbFetchAffiliateRecommendations().then((recs) => {
      if (isMounted) {
        setCatalog(recs || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Check room-scoped sponsor CTA from localStorage if not passed explicitly
  const effectiveSponsorCTA = useMemo<SponsorCTA | null>(() => {
    if (sponsorCTA) return sponsorCTA;
    if (roomCode && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`sketchcast_room_sponsor_cta_${roomCode.toUpperCase().trim()}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }
    return null;
  }, [sponsorCTA, roomCode]);

  return useMemo(() => {
    return matchAffiliateRecommendation({
      placement,
      question,
      accuracyPct: accuracyPct ?? accuracyRate,
      roomTitle,
      roomTopic,
      contextKeywords,
      sponsorCTA: effectiveSponsorCTA,
      customCatalog: catalog,
    });
  }, [placement, question, accuracyPct, accuracyRate, roomTitle, roomTopic, contextKeywords, effectiveSponsorCTA, catalog]);
}
