import { describe, it, expect } from 'vitest';
import { scoreProduct, scoreProducts } from '../src/lib/commerce/intelligence/product-scoring';
import type { DiscoveredProduct } from '../src/lib/commerce/intelligence/types';

function makeProduct(overrides: Partial<DiscoveredProduct> = {}): DiscoveredProduct {
  return {
    id: crypto.randomUUID(),
    source: 'csv',
    title: 'Test Ürün',
    price: 40,
    cost: 12,
    currency: 'TRY',
    images: [],
    shippingDays: 7,
    metadata: {},
    discoveredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Product Scoring — 10 faktör Commerce Score', () => {
  it('10 faktör üretir, toplam 0-100', () => {
    const score = scoreProduct(makeProduct());
    expect(score.factors).toHaveLength(10);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('yüksek marj + hızlı kargo + az rakip → winner', () => {
    const score = scoreProduct(makeProduct({ price: 45, cost: 10, shippingDays: 5 }), {
      competitorCount: 1,
      avgAdIntensity: 15,
      executiveRiskScore: 20,
    });
    expect(score.verdict).toBe('winner');
    expect(score.total).toBeGreaterThanOrEqual(75);
  });

  it('düşük marj + yavaş kargo + çok rakip → avoid/risky', () => {
    const score = scoreProduct(makeProduct({ price: 100, cost: 90, shippingDays: 30 }), {
      competitorCount: 12,
      avgAdIntensity: 90,
      executiveRiskScore: 80,
    });
    expect(['avoid', 'risky']).toContain(score.verdict);
    expect(score.total).toBeLessThan(60);
  });

  it('estimatedMargin doğru hesaplanır', () => {
    const score = scoreProduct(makeProduct({ price: 100, cost: 40 }));
    expect(score.estimatedMargin).toBeCloseTo(60, 0);
    expect(score.estimatedProfit).toBeCloseTo(60, 0);
  });

  it('Executive Confidence faktörü risk skorunu yansıtır', () => {
    const lowRisk = scoreProduct(makeProduct(), { executiveRiskScore: 10 });
    const highRisk = scoreProduct(makeProduct(), { executiveRiskScore: 90 });
    const lowConf = lowRisk.factors.find((f) => f.name === 'Executive Confidence')!;
    const highConf = highRisk.factors.find((f) => f.name === 'Executive Confidence')!;
    expect(lowConf.value).toBeGreaterThan(highConf.value);
  });

  it('faktör ağırlıkları toplamı ~1.0', () => {
    const score = scoreProduct(makeProduct());
    const totalWeight = score.factors.reduce((s, f) => s + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it('scoreProducts skora göre azalan sıralar', () => {
    const products = [
      makeProduct({ price: 100, cost: 95, shippingDays: 30 }),
      makeProduct({ price: 45, cost: 10, shippingDays: 5 }),
    ];
    const scores = scoreProducts(products, { competitorCount: 2 });
    expect(scores[0]!.total).toBeGreaterThanOrEqual(scores[1]!.total);
  });

  it('her faktör reasoning içerir', () => {
    const score = scoreProduct(makeProduct());
    expect(score.factors.every((f) => f.reasoning.length > 0)).toBe(true);
  });
});
