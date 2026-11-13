import type {
  CommerceIntelligenceDashboard,
  ProductDiscoveryQuery,
  DiscoveredProduct,
  CreativeBrief,
  AdCampaignPlan,
  AdPlatform,
} from '../types';
import { huntProducts, analyzeSingleProduct, type HuntResult } from '../product-hunter';
import { discoverProducts, listDiscoveryProviders, loadCsvSource } from '../discovery-registry';
import { getQueue, getQueueMetrics } from '../product-queue';
import { buildCreativeBrief } from '../creative-intelligence';
import { buildCampaignPlan } from '../advertising-intelligence';
import { getRevenueMetrics } from '../revenue-intelligence';
import { getInventoryReport } from '../inventory-intelligence';
import {
  getRecentAdMetrics,
  getActiveCampaignCount,
  getAverageRoas,
  recommendAdAction,
  recordAdMetrics,
} from '../ad-optimizer';
import { getCompetitorHistory } from '../competitor-intelligence';
import { getCommerceOverview } from '../../commerce-service';
import { withCache } from '@/lib/cache';

// Commerce Intelligence Service — mobil-hazır facade. Düz JSON. Dashboard +
// mobile + agent bu katmanı kullanır. Ağır okumalar TTL cache arkasında.

export function commerceDiscover(query: ProductDiscoveryQuery): Promise<DiscoveredProduct[]> {
  return discoverProducts(query);
}

export function commerceHunt(
  query: ProductDiscoveryQuery & { count?: number },
): Promise<HuntResult> {
  return huntProducts(query);
}

export function commerceLoadCsv(csv: string): number {
  return loadCsvSource(csv);
}

export function commerceProviders() {
  return listDiscoveryProviders();
}

export function commerceQueue(status?: 'pending' | 'approved' | 'published' | 'rejected') {
  return getQueue(status);
}

export function commerceCreativeBrief(product: DiscoveredProduct): CreativeBrief {
  return buildCreativeBrief(product);
}

export function commerceCampaignPlan(
  product: DiscoveredProduct,
  platform: AdPlatform,
  dailyBudget?: number,
): AdCampaignPlan {
  return buildCampaignPlan({ product, platform, dailyBudget });
}

export function commerceRevenue() {
  return getRevenueMetrics();
}

export function commerceInventory(threshold?: number) {
  return getInventoryReport(threshold);
}

export function commerceSuppliers(products: DiscoveredProduct[]) {
  return products.map((p) => analyzeSingleProduct(p).supplier);
}

export function commerceAdMetrics() {
  return getRecentAdMetrics();
}

export function commerceRecordAdMetrics(input: Parameters<typeof recordAdMetrics>[0]) {
  const metrics = recordAdMetrics(input);
  return { metrics, recommendation: recommendAdAction(metrics) };
}

export function commerceCompetitor(competitor: string, product: string) {
  return getCompetitorHistory(competitor, product);
}

/** Commerce Dashboard — Revenue/Profit/Orders/Ads/Products/Hunter/Supplier/ROAS/Executive. */
export async function commerceDashboard(): Promise<CommerceIntelligenceDashboard> {
  return withCache('commerce:dashboard', 15_000, async () => {
    const [revenue, overview, inventory] = await Promise.all([
      getRevenueMetrics(),
      getCommerceOverview(50).catch(() => null),
      getInventoryReport().catch(() => null),
    ]);

    const queueMetrics = getQueueMetrics();
    const queue = getQueue('pending', 20);
    const suppliers = queue
      .map((q) => q.supplier)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const avgRating = suppliers.length
      ? suppliers.reduce((s, x) => s + x.rating, 0) / suppliers.length
      : 0;
    const highRisk = suppliers.filter((s) => s.reliability === 'low').length;

    const alerts: CommerceIntelligenceDashboard['alerts'] = [];
    if (inventory && inventory.criticalCount > 0) {
      alerts.push({
        kind: 'inventory',
        message: `${inventory.criticalCount} ürün kritik stok`,
        severity: 'warning',
      });
    }
    if (revenue.roas > 0 && revenue.roas < 1) {
      alerts.push({
        kind: 'ads',
        message: `ROAS ${revenue.roas} < 1 — reklamlar zarar ediyor`,
        severity: 'critical',
      });
    }
    if (queueMetrics.topScore >= 75) {
      alerts.push({
        kind: 'hunter',
        message: `Kazanan ürün bulundu (skor ${queueMetrics.topScore})`,
        severity: 'info',
      });
    }

    const executiveRecommendation =
      revenue.roas >= 2.5
        ? 'ROAS güçlü — kazanan ürünlerde bütçe ölçeklendir (onaylı).'
        : queueMetrics.topScore >= 75
          ? 'Yüksek skorlu ürün yayına hazır — Approval bekliyor.'
          : revenue.roas > 0 && revenue.roas < 1
            ? 'Zarar eden reklamları durdur (onaylı).'
            : 'Yeni ürün avı başlat — Hunter ile fırsat tara.';

    return {
      revenue,
      orders: {
        total: overview?.metrics.totalOrders ?? 0,
        pending: overview?.metrics.pendingOrders ?? 0,
      },
      products: {
        total: overview?.products.length ?? 0,
        active: overview?.products.filter((p) => p.status === 'active').length ?? 0,
      },
      ads: { activeCampaigns: getActiveCampaignCount(), averageRoas: getAverageRoas() },
      hunterQueue: {
        pending: queueMetrics.pending,
        approved: queueMetrics.approved,
        topScore: queueMetrics.topScore,
      },
      supplierHealth: { averageRating: Number(avgRating.toFixed(1)), highRiskCount: highRisk },
      executiveRecommendation,
      alerts,
      generatedAt: new Date().toISOString(),
    };
  });
}
