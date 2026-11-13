import type { RevenueMetrics } from './types';
import { getCommerceOverview } from '../commerce-service';
import { getAverageRoas, getRecentAdMetrics } from './ad-optimizer';

// Revenue Intelligence — Ciro/Kâr/ROAS/LTV/CAC/AOV/Conversion/Refund.
// Mevcut commerce-service (migration 009 gerçek okuma) + ad metriklerini birleştirir.

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const commerce = await getCommerceOverview(100).catch(() => null);
  const adMetrics = getRecentAdMetrics(100);

  const revenue = commerce?.metrics.revenue ?? 0;
  const profit = commerce?.metrics.estimatedProfit ?? 0;
  const orderCount = commerce?.metrics.totalOrders ?? 0;

  const adSpend = adMetrics.reduce((s, m) => s + m.spend, 0);
  const adConversions = adMetrics.reduce((s, m) => s + m.conversions, 0);
  const adClicks = adMetrics.reduce((s, m) => s + m.clicks, 0);

  const aov = orderCount > 0 ? Number((revenue / orderCount).toFixed(2)) : 0;
  const cac = adConversions > 0 ? Number((adSpend / adConversions).toFixed(2)) : 0;
  // LTV proxy: AOV * tahmini tekrar satın alma (1.4x) - basit ama gerçek veriden
  const ltv = Number((aov * 1.4).toFixed(2));
  const conversionRate = adClicks > 0 ? Number(((adConversions / adClicks) * 100).toFixed(2)) : 0;
  const refundRate = commerce ? estimateRefundRate(commerce) : 0;

  return {
    revenue: Number(revenue.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    roas: getAverageRoas(),
    ltv,
    cac,
    aov,
    conversionRate,
    refundRate,
    currency: commerce?.metrics.currency ?? 'TRY',
    generatedAt: new Date().toISOString(),
  };
}

function estimateRefundRate(
  commerce: NonNullable<Awaited<ReturnType<typeof getCommerceOverview>>>,
): number {
  const refunded = commerce.orders.filter(
    (o) => o.status === 'refunded' || o.status === 'returned',
  ).length;
  const total = commerce.orders.length;
  return total > 0 ? Number(((refunded / total) * 100).toFixed(2)) : 0;
}
