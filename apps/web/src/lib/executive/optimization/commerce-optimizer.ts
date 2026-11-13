import type { ProductPerformance, OptimizerRecommendation } from './types';
import { getRecentAdMetrics } from '@/lib/commerce/intelligence/ad-optimizer';
import { getRevenueMetrics } from '@/lib/commerce/intelligence/revenue-intelligence';
import { getCommerceOverview } from '@/lib/commerce/commerce-service';

// Commerce Optimizer — her ürün/kampanya için satış/reklam/ROAS/marj/iade.
// Executive ÖNERİ üretir (kaldır/ölçekle/fiyat/reklam). Gelir etkileyen aksiyon
// requiresApproval: true → Approval Queue. Onaysız HİÇBİR işlem yapılmaz.

/** Ürün/kampanya performansı — gerçek commerce overview + ad metrics. */
export async function getProductPerformance(): Promise<ProductPerformance[]> {
  const [overview, revenue] = await Promise.all([
    getCommerceOverview(50).catch(() => null),
    getRevenueMetrics().catch(() => null),
  ]);
  const ads = getRecentAdMetrics(100);

  const results: ProductPerformance[] = [];
  // Genel marj: revenue profit/revenue oranı (ürün-bazlı maliyet verisi yoksa)
  const overallMargin =
    revenue && revenue.revenue > 0
      ? Number(((revenue.profit / revenue.revenue) * 100).toFixed(1))
      : 0;
  const refundRate = revenue?.refundRate ?? 0;

  // Ürün bazlı (commerce overview products) — satış = eşleşen reklam conversions
  for (const p of overview?.products ?? []) {
    const title = p.title;
    const productAds = ads.filter((a) =>
      a.campaignId.toLocaleLowerCase('tr').includes(title.slice(0, 8).toLocaleLowerCase('tr')),
    );
    const adSpend = productAds.reduce((s, a) => s + a.spend, 0);
    const adRevenue = productAds.reduce((s, a) => s + a.revenue, 0);
    const sales = productAds.reduce((s, a) => s + a.conversions, 0);
    const roas = adSpend > 0 ? Number((adRevenue / adSpend).toFixed(2)) : (revenue?.roas ?? 0);

    const { action, rationale } = decideProductAction({
      roas,
      marginPercent: overallMargin,
      sales,
      refundRate,
      adSpend,
    });
    results.push({
      product: title,
      sales,
      adSpend,
      roas,
      marginPercent: overallMargin,
      refundRate,
      action,
      rationale,
    });
  }

  return results.sort((a, b) => b.roas - a.roas);
}

function decideProductAction(m: {
  roas: number;
  marginPercent: number;
  sales: number;
  refundRate: number;
  adSpend: number;
}): { action: ProductPerformance['action']; rationale: string } {
  if (m.adSpend > 0 && m.roas < 1) {
    return { action: 'pause-ad', rationale: `ROAS ${m.roas} < 1 — reklam zarar ediyor.` };
  }
  if (m.roas >= 4 && m.marginPercent >= 30) {
    return {
      action: 'scale',
      rationale: `ROAS ${m.roas}, marj %${m.marginPercent} — ölçeklenebilir kazanan.`,
    };
  }
  if (m.refundRate > 15) {
    return { action: 'remove', rationale: `İade oranı %${m.refundRate} — kârı eritiyor.` };
  }
  if (m.marginPercent < 15 && m.sales > 0) {
    return {
      action: 'raise-price',
      rationale: `Marj %${m.marginPercent} çok düşük — fiyat artışı öner.`,
    };
  }
  if (m.roas >= 2 && m.roas < 4) {
    return {
      action: 'boost-ad',
      rationale: `ROAS ${m.roas} sağlıklı — reklam bütçesi artırılabilir.`,
    };
  }
  if (m.sales === 0 && m.adSpend > 0) {
    return {
      action: 'lower-price',
      rationale: 'Reklam var ama satış yok — fiyat düşürme testi öner.',
    };
  }
  return { action: 'keep', rationale: 'Performans dengeli — değişiklik önerilmiyor.' };
}

const REVENUE_IMPACTING: ProductPerformance['action'][] = [
  'scale',
  'raise-price',
  'lower-price',
  'boost-ad',
  'pause-ad',
  'remove',
];

/** Executive önerileri — gelir etkileyen aksiyonlar Approval Queue gerektirir. */
export async function getCommerceRecommendations(): Promise<OptimizerRecommendation[]> {
  const perf = await getProductPerformance();
  const recs: OptimizerRecommendation[] = [];

  for (const p of perf) {
    if (p.action === 'keep') continue;
    const revenueImpacting = REVENUE_IMPACTING.includes(p.action);
    recs.push({
      id: crypto.randomUUID(),
      domain: 'commerce',
      action: actionLabel(p.action),
      target: p.product,
      rationale: p.rationale,
      impact: p.action === 'remove' || p.action === 'scale' ? 'high' : 'medium',
      requiresApproval: revenueImpacting, // gerçek para → Approval Queue
      metrics: {
        roas: p.roas,
        marginPercent: p.marginPercent,
        sales: p.sales,
        refundRate: p.refundRate,
      },
      generatedAt: new Date().toISOString(),
    });
  }

  return recs;
}

function actionLabel(action: ProductPerformance['action']): string {
  const map: Record<ProductPerformance['action'], string> = {
    scale: 'Ürünü ölçekle (bütçe artır)',
    keep: 'Koru',
    'raise-price': 'Fiyat artır',
    'lower-price': 'Fiyat düşür',
    'boost-ad': 'Reklam bütçesini artır',
    'pause-ad': 'Reklamı durdur',
    remove: 'Kârsız ürünü kaldır',
  };
  return map[action];
}
