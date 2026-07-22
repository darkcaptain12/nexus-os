import type { DiscoveredProduct, AdCampaignPlan, AdPlatform, CreativeBrief } from './types';

// Advertising Intelligence — Meta/Google/TikTok kampanya planı hazırlar.
// Campaign/AdSet/Creative/Audience/Budget/Pixel. Yayın öncesi Approval ZORUNLU
// (requiresApproval:true — gerçek para harcama). Bu katman PLAN üretir, yayınlamaz.

const PLATFORM_DEFAULTS: Record<
  AdPlatform,
  { objective: string; placements: string[]; pixelEvent: string }
> = {
  meta: {
    objective: 'CONVERSIONS',
    placements: ['facebook_feed', 'instagram_feed', 'instagram_reels'],
    pixelEvent: 'Purchase',
  },
  google: {
    objective: 'SALES',
    placements: ['search', 'youtube', 'display'],
    pixelEvent: 'conversion',
  },
  tiktok: {
    objective: 'CONVERSIONS',
    placements: ['tiktok_feed', 'top_view'],
    pixelEvent: 'CompletePayment',
  },
};

export interface CampaignInput {
  product: DiscoveredProduct;
  platform: AdPlatform;
  dailyBudget?: number;
  creative?: CreativeBrief;
  targetCountry?: string;
}

/** Kampanya planı üret — test bütçesiyle 2 ad set (broad + interest). */
export function buildCampaignPlan(input: CampaignInput): AdCampaignPlan {
  const { product, platform } = input;
  const defaults = PLATFORM_DEFAULTS[platform];
  const dailyBudget = input.dailyBudget ?? 10; // test bütçesi
  const country = input.targetCountry ?? 'TR';

  const headline = input.creative?.headlines[0] ?? product.title;
  const primaryText = input.creative?.descriptions[0] ?? `${product.title} — şimdi keşfet.`;

  const adSets = [
    {
      name: `${product.title} — Broad`,
      audience: `${country}, 18-55, geniş kitle (algoritma optimizasyonu)`,
      dailyBudget: Number((dailyBudget / 2).toFixed(2)),
      placements: defaults.placements,
    },
    {
      name: `${product.title} — Interest`,
      audience: `${country}, 25-45, ${product.category ?? 'ürün'} ilgi alanı`,
      dailyBudget: Number((dailyBudget / 2).toFixed(2)),
      placements: defaults.placements,
    },
  ];

  return {
    id: crypto.randomUUID(),
    platform,
    productId: product.id,
    campaignName: `${product.title} — ${platform.toUpperCase()} Launch`,
    objective: defaults.objective,
    adSets,
    creative: {
      headline,
      primaryText,
      callToAction: platform === 'tiktok' ? 'Shop Now' : 'Alışverişe Başla',
    },
    pixelEvent: defaults.pixelEvent,
    totalDailyBudget: dailyBudget,
    requiresApproval: true,
    createdAt: new Date().toISOString(),
  };
}
