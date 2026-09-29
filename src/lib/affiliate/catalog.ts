import type { AffiliateRecommendation } from '../../types';

/**
 * Built-in catalog is empty by default.
 * Recommendations will ONLY be served if configured and enabled by the host/admin
 * in Room Settings (Sponsor CTA) or User Settings (Affiliate Recommendations).
 */
export const DEFAULT_AFFILIATE_CATALOG: AffiliateRecommendation[] = [];
