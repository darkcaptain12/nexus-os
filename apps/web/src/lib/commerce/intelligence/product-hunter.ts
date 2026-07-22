import type { QueuedProduct, ProductDiscoveryQuery, DiscoveredProduct } from './types';
import { discoverProducts } from './discovery-registry';
import { scoreProduct, type ScoringContext } from './product-scoring';
import { profileSupplier } from './supplier-intelligence';
import { getCompetitorCount, getAvgAdIntensity } from './competitor-intelligence';
import { enqueueProduct } from './product-queue';
import { getExecutiveDashboard } from '@/lib/ai/executive';
import { getMemoryStore } from '@/lib/memory/store';
import { recordCommerceProduct } from '@/lib/knowledge/auto-linker';

// AI Product Hunter — Executive ile çalışır: "bu hafta satılabilecek 20 ürün bul".
// Discovery → Scoring → Supplier → Queue. Executive risk skoru scoring'e beslenir.
// Money-spending YOK (sadece keşif+skor); publish ayrı ve Approval'lı.

export interface HuntResult {
  requested: number;
  discovered: number;
  queued: QueuedProduct[];
  topScore: number;
  durationMs: number;
}

/**
 * Ürün avla: kaynaklardan keşfet, skorla (Executive confidence dahil), tedarikçi
 * profili çıkar, kuyruğa al. Knowledge Graph + Memory'ye bağlanır.
 */
export async function huntProducts(
  query: ProductDiscoveryQuery & { count?: number },
): Promise<HuntResult> {
  const start = performance.now();
  const count = query.count ?? 20;

  // Executive risk skoru — scoring context'ine beslenir
  let executiveRiskScore = 40;
  try {
    const dashboard = await getExecutiveDashboard();
    executiveRiskScore = dashboard.riskScore;
  } catch {
    // Executive hazır değil — varsayılan
  }

  const discovered = await discoverProducts({ ...query, limit: Math.max(count * 2, 40) });

  const queued: QueuedProduct[] = [];
  for (const product of discovered) {
    const ctx: ScoringContext = {
      competitorCount: getCompetitorCount(product.title),
      avgAdIntensity: getAvgAdIntensity(product.title),
      month: new Date().getMonth() + 1,
      executiveRiskScore,
    };
    const score = scoreProduct(product, ctx);
    const supplier = profileSupplier(product);
    const item = enqueueProduct({ product, score, supplier });
    queued.push(item);
    recordCommerceProduct({
      title: product.title,
      source: product.source,
      score: score.total,
      verdict: score.verdict,
    });
  }

  // En yüksek skora göre sırala, count kadar döndür
  queued.sort((a, b) => b.score.total - a.score.total);
  const top = queued.slice(0, count);

  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `Product Hunter: ${top.length} ürün bulundu`,
    description: `${discovered.length} keşif, en yüksek skor ${top[0]?.score.total ?? 0}. Sorgu: ${query.keyword ?? 'genel'}`,
    timestamp: new Date().toISOString(),
    metadata: { discovered: discovered.length, queued: top.length },
  });

  return {
    requested: count,
    discovered: discovered.length,
    queued: top,
    topScore: top[0]?.score.total ?? 0,
    durationMs: Math.round(performance.now() - start),
  };
}

/** Tek üründen doğrudan skorla (test/manuel). */
export function analyzeSingleProduct(product: DiscoveredProduct) {
  const ctx: ScoringContext = {
    competitorCount: getCompetitorCount(product.title),
    avgAdIntensity: getAvgAdIntensity(product.title),
    month: new Date().getMonth() + 1,
  };
  return { score: scoreProduct(product, ctx), supplier: profileSupplier(product) };
}
