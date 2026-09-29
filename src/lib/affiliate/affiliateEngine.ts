import type {
  AffiliatePlacement,
  AffiliateRecommendation,
  QuizQuestion,
  ResolvedAffiliateCardData,
  SponsorCTA,
} from '../../types';

export interface MatchAffiliateOptions {
  placement: AffiliatePlacement;
  question?: QuizQuestion | null;
  accuracyPct?: number | null;
  accuracyRate?: number | null;
  roomTitle?: string;
  roomTopic?: string;
  contextKeywords?: string[];
  sponsorCTA?: SponsorCTA | null;
  customCatalog?: AffiliateRecommendation[];
}

/**
 * Normalizes input text into clean lowercase token array for semantic matching.
 */
function extractTokens(text?: string | null): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/**
 * Smart Contextual Affiliate Matcher
 * Matches questions or rooms to the highest-converting partner recommendation,
 * with audience accuracy-aware dynamic framing and host sponsor override support.
 */
export function matchAffiliateRecommendation({
  placement,
  question,
  accuracyPct,
  accuracyRate,
  roomTitle,
  roomTopic,
  contextKeywords,
  sponsorCTA,
  customCatalog,
}: MatchAffiliateOptions): ResolvedAffiliateCardData | null {
  const effectiveAccuracy = accuracyPct ?? accuracyRate;

  // 1. Host Custom Sponsor CTA Override
  const sponsorUrl = sponsorCTA?.url || sponsorCTA?.ctaUrl;
  if (sponsorCTA && sponsorCTA.enabled && sponsorUrl) {
    if (sponsorCTA.overrideDefault || !question) {
      return {
        id: 'host_sponsor_cta',
        title: sponsorCTA.title || 'Official Session Sponsor',
        headline: sponsorCTA.headline || sponsorCTA.title || 'Featured Resource',
        description: sponsorCTA.description,
        provider: sponsorCTA.sponsorName || sponsorCTA.provider || 'Session Sponsor',
        badgeText: sponsorCTA.badge || 'FEATURED',
        affiliateUrl: sponsorUrl,
        ctaUrl: sponsorUrl,
        ctaText: sponsorCTA.ctaText || 'Learn More',
        customCopy: sponsorCTA.description,
        discountCode: sponsorCTA.discountCode,
        themeColor: 'purple',
        isCustomSponsor: true,
        dynamicContextNote: 'Presented by Session Host',
      };
    }
  }

  // 2. Prepare Pool of Active Recommendations
  const catalog = customCatalog && customCatalog.length > 0 ? customCatalog : [];
  const activePool = catalog.filter(
    (item) => item.is_active && (!item.target_placements || item.target_placements.includes(placement))
  );

  if (activePool.length === 0) {
    // If no affiliate catalog matches, fallback to custom host sponsor CTA if enabled
    if (sponsorCTA && sponsorCTA.enabled && sponsorUrl) {
      return {
        id: 'host_sponsor_cta',
        title: sponsorCTA.title || 'Official Session Sponsor',
        headline: sponsorCTA.headline || sponsorCTA.title || 'Featured Resource',
        description: sponsorCTA.description,
        provider: sponsorCTA.sponsorName || sponsorCTA.provider || 'Session Sponsor',
        badgeText: sponsorCTA.badge || 'FEATURED',
        affiliateUrl: sponsorUrl,
        ctaUrl: sponsorUrl,
        ctaText: sponsorCTA.ctaText || 'Learn More',
        customCopy: sponsorCTA.description,
        discountCode: sponsorCTA.discountCode,
        themeColor: 'purple',
        isCustomSponsor: true,
        dynamicContextNote: 'Presented by Session Host',
      };
    }
    return null;
  }

  // 3. Compile context search text
  const questionTokens = new Set([
    ...extractTokens(question?.question),
    ...extractTokens(question?.category),
    ...extractTokens(question?.explanation),
    ...extractTokens(roomTopic),
    ...extractTokens(roomTitle),
    ...((contextKeywords || []).flatMap((kw) => extractTokens(kw))),
  ]);

  const rawSearchBlob = [
    question?.question || '',
    question?.category || '',
    question?.explanation || '',
    roomTopic || '',
    roomTitle || '',
    ...(contextKeywords || []),
  ]
    .join(' ')
    .toLowerCase();

  // 4. Score Candidate Recommendations
  let bestItem: AffiliateRecommendation | null = null;
  let highestScore = -1;

  for (const item of activePool) {
    let score = 0;

    // A. Keyword matches
    for (const kw of item.keywords || []) {
      const cleanKw = kw.toLowerCase().trim();
      if (!cleanKw) continue;

      if (rawSearchBlob.includes(cleanKw)) {
        // Multi-word phrase matches are high-intent (e.g. 'system design', 'cloud security')
        score += cleanKw.includes(' ') ? 8 : 4;
      } else if (questionTokens.has(cleanKw)) {
        score += 3;
      }
    }

    // B. Category match
    if (question?.category) {
      const qCat = question.category.toLowerCase();
      if (item.category.toLowerCase().includes(qCat) || qCat.includes(item.category.toLowerCase())) {
        score += 6;
      }
    }

    // C. Difficulty affinity
    if (question?.difficultyTier && item.min_difficulty && item.min_difficulty !== 'any') {
      const isSeniorOrLead = ['Senior', 'Principal', 'Lead'].includes(question.difficultyTier);
      if (isSeniorOrLead && ['senior', 'lead'].includes(item.min_difficulty.toLowerCase())) {
        score += 3;
      }
    }

    // D. Base priority weight
    score += (item.priority || 0) * 0.05;

    if (score > highestScore) {
      highestScore = score;
      bestItem = item;
    }
  }

  // Fallback to highest priority item if no specific keyword matched
  if (!bestItem || highestScore <= 0) {
    bestItem = [...activePool].sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  }

  if (!bestItem) return null;

  // 5. Dynamic Contextual Copy Generation
  let dynamicContextNote: string;
  if (typeof effectiveAccuracy === 'number') {
    if (effectiveAccuracy < 50) {
      dynamicContextNote = 'High misconception concept — Reinforce foundations with this verified path';
    } else if (effectiveAccuracy >= 80) {
      dynamicContextNote = 'Aced this challenge! Elevate to senior architecture with this advanced track';
    } else {
      dynamicContextNote = 'Key architectural reference recommended for this topic';
    }
  } else if (placement === 'certificate') {
    dynamicContextNote = 'Credential verified — Accelerate to your next industry certification';
  } else if (placement === 'leaderboard') {
    dynamicContextNote = 'Podium performer — Recommended career accelerators for top scorers';
  } else if (placement === 'report') {
    dynamicContextNote = 'Curated Deep-Dive Architecture Reference';
  } else {
    dynamicContextNote = 'Recommended Learning Path';
  }

  const validThemeColors: Array<'blue' | 'purple' | 'amber' | 'emerald' | 'rose'> = [
    'blue',
    'purple',
    'amber',
    'emerald',
    'rose',
  ];
  const themeColor = validThemeColors.includes(bestItem.theme_color as any)
    ? (bestItem.theme_color as 'blue' | 'purple' | 'amber' | 'emerald' | 'rose')
    : 'blue';

  return {
    id: bestItem.id,
    title: bestItem.title,
    headline: bestItem.headline,
    description: bestItem.description,
    provider: bestItem.provider,
    badgeText: bestItem.badge_text,
    affiliateUrl: bestItem.affiliate_url,
    ctaUrl: bestItem.affiliate_url,
    ctaText: 'Access Resource',
    customCopy: dynamicContextNote || bestItem.description,
    discountCode: bestItem.discount_code,
    iconKey: bestItem.icon_key,
    themeColor,
    isCustomSponsor: false,
    dynamicContextNote,
  };
}
