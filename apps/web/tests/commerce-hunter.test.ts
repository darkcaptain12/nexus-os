import { describe, it, expect, beforeEach } from 'vitest';
import {
  huntProducts,
  analyzeSingleProduct,
} from '../src/lib/commerce/intelligence/product-hunter';
import { loadCsvSource } from '../src/lib/commerce/intelligence/discovery-registry';
import { getQueue, getQueueMetrics } from '../src/lib/commerce/intelligence/product-queue';
import { buildCreativeBrief } from '../src/lib/commerce/intelligence/creative-intelligence';
import { buildCampaignPlan } from '../src/lib/commerce/intelligence/advertising-intelligence';
import type { DiscoveredProduct } from '../src/lib/commerce/intelligence/types';

const CSV = `title,price,cost,currency,category,supplier,country,shipping_days
Winner Ürün,45,10,TRY,elektronik,GoodCo,Türkiye,5
Orta Ürün,60,35,TRY,ev,MidCo,China,15
Zayıf Ürün,120,110,TRY,giyim,SlowCo,unknown,35`;

function makeProduct(o: Partial<DiscoveredProduct> = {}): DiscoveredProduct {
  return {
    id: crypto.randomUUID(),
    source: 'csv',
    title: 'Test',
    price: 40,
    cost: 12,
    currency: 'TRY',
    images: [],
    category: 'elektronik',
    metadata: {},
    discoveredAt: new Date().toISOString(),
    ...o,
  };
}

describe('AI Product Hunter', () => {
  beforeEach(() => loadCsvSource(CSV));

  it('ürün avlar, skorlar, kuyruğa alır', async () => {
    const result = await huntProducts({ count: 3 });
    expect(result.discovered).toBeGreaterThanOrEqual(3);
    expect(result.queued.length).toBeGreaterThan(0);
    expect(result.topScore).toBeGreaterThan(0);
  });

  it('kuyruk en yüksek skora göre sıralı', async () => {
    const result = await huntProducts({ count: 5 });
    for (let i = 1; i < result.queued.length; i++) {
      expect(result.queued[i - 1]!.score.total).toBeGreaterThanOrEqual(
        result.queued[i]!.score.total,
      );
    }
  });

  it('en iyi ürün Winner Ürün (yüksek marj+hızlı kargo)', async () => {
    const result = await huntProducts({ count: 3, keyword: 'Winner' });
    const top = result.queued[0];
    expect(top!.product.title).toContain('Winner');
    expect(top!.score.total).toBeGreaterThanOrEqual(60);
  });

  it('her kuyruk öğesi supplier profili içerir', async () => {
    const result = await huntProducts({ count: 3 });
    expect(result.queued.every((q) => q.supplier !== null)).toBe(true);
  });

  it('queue metrics pending + topScore', async () => {
    await huntProducts({ count: 3 });
    const m = getQueueMetrics();
    expect(m.pending).toBeGreaterThan(0);
    expect(m.topScore).toBeGreaterThan(0);
    expect(getQueue('pending').length).toBeGreaterThan(0);
  });

  it('analyzeSingleProduct skor + supplier döner', () => {
    const { score, supplier } = analyzeSingleProduct(makeProduct());
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(supplier.reliability).toBeTruthy();
  });
});

describe('Creative Intelligence', () => {
  it('brief hook/başlık/açıklama/prompt/senaryo üretir', () => {
    const brief = buildCreativeBrief(makeProduct({ title: 'Akıllı Saat', price: 50, cost: 15 }));
    expect(brief.hooks.length).toBeGreaterThan(0);
    expect(brief.headlines.length).toBeGreaterThan(0);
    expect(brief.imagePrompts.length).toBeGreaterThan(0);
    expect(brief.videoScenario).toContain('SAHNE');
    expect(brief.ugcIdeas.length).toBeGreaterThan(0);
    expect(brief.thumbnailPrompt).toContain('Akıllı Saat');
  });
});

describe('Advertising Intelligence', () => {
  it('Meta kampanya planı — requiresApproval, 2 ad set', () => {
    const plan = buildCampaignPlan({ product: makeProduct(), platform: 'meta', dailyBudget: 20 });
    expect(plan.requiresApproval).toBe(true);
    expect(plan.adSets).toHaveLength(2);
    expect(plan.totalDailyBudget).toBe(20);
    expect(plan.pixelEvent).toBe('Purchase');
  });

  it('TikTok planı doğru placements + CTA', () => {
    const plan = buildCampaignPlan({ product: makeProduct(), platform: 'tiktok' });
    expect(plan.platform).toBe('tiktok');
    expect(plan.creative.callToAction).toBe('Shop Now');
    expect(plan.pixelEvent).toBe('CompletePayment');
  });

  it("bütçe ad set'lere bölünür", () => {
    const plan = buildCampaignPlan({ product: makeProduct(), platform: 'google', dailyBudget: 30 });
    const sum = plan.adSets.reduce((s, a) => s + a.dailyBudget, 0);
    expect(sum).toBeCloseTo(30, 1);
  });
});
