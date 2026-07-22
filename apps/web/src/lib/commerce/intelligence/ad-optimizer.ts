import type { AdMetrics, AdRecommendation, AdPlatform } from './types';

// Ad Optimizer — CTR/CPC/CPM/ROAS/CPA/Conversion takibi + Executive önerileri.
// Öneriler explainable; bütçe artırma/reklam durdurma requiresApproval.

const MAX_METRICS = 200;
const g = globalThis as unknown as { __apexAdMetrics?: AdMetrics[] };

function store(): AdMetrics[] {
  if (!g.__apexAdMetrics) g.__apexAdMetrics = [];
  return g.__apexAdMetrics;
}

/** Ham reklam verisinden metrikleri hesapla + kaydet. */
export function recordAdMetrics(input: {
  campaignId: string;
  platform: AdPlatform;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
}): AdMetrics {
  const { impressions, clicks, spend, conversions, revenue } = input;
  const metrics: AdMetrics = {
    campaignId: input.campaignId,
    platform: input.platform,
    impressions,
    clicks,
    spend,
    conversions,
    revenue,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0,
    cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : 0,
    roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
    capturedAt: new Date().toISOString(),
  };
  const s = store();
  s.push(metrics);
  if (s.length > MAX_METRICS) s.shift();
  return metrics;
}

/**
 * Executive önerisi üret: ROAS/CPA/CTR eşiklerine göre.
 * Bütçe artır / reklam durdur / creative değiştir / audience değiştir.
 */
export function recommendAdAction(metrics: AdMetrics): AdRecommendation {
  const { roas, cpa, ctr } = metrics;
  let action: AdRecommendation['action'] = 'keep';
  let reasoning: string; // her dalda atanır (else terminal)
  let confidence = 0.6;
  let requiresApproval = false;

  if (roas >= 2.5 && ctr >= 1.5) {
    action = 'increase_budget';
    reasoning = `ROAS ${roas} güçlü, CTR ${ctr}% sağlıklı — ölçeklenebilir. Bütçe artışı onay gerektirir (gerçek para).`;
    confidence = 0.85;
    requiresApproval = true; // bütçe artırma = para harcama
  } else if (roas < 1 && metrics.spend > 0) {
    action = 'pause_ad';
    reasoning = `ROAS ${roas} < 1 — zarar ediyor. Reklamı durdur.`;
    confidence = 0.9;
    requiresApproval = true; // reklam durdurma kritik karar
  } else if (ctr < 0.8) {
    action = 'change_creative';
    reasoning = `CTR ${ctr}% düşük — creative ilgi çekmiyor, yenile.`;
    confidence = 0.75;
  } else if (cpa > 0 && roas < 1.8) {
    action = 'change_audience';
    reasoning = `CPA ${cpa} yüksek, ROAS ${roas} zayıf — audience yeniden hedeflenmeli.`;
    confidence = 0.7;
  } else {
    reasoning = `ROAS ${roas}, CTR ${ctr}% dengeli — mevcut ayarları koru.`;
  }

  return {
    campaignId: metrics.campaignId,
    action,
    reasoning,
    confidence,
    requiresApproval,
    metrics: { roas, cpa, ctr },
  };
}

export function getRecentAdMetrics(limit = 20): AdMetrics[] {
  return store().slice(-limit).reverse();
}

export function getActiveCampaignCount(): number {
  const seen = new Set(store().map((m) => m.campaignId));
  return seen.size;
}

export function getAverageRoas(): number {
  const s = store();
  if (s.length === 0) return 0;
  return Number((s.reduce((sum, m) => sum + m.roas, 0) / s.length).toFixed(2));
}
