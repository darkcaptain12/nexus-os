import { describe, it, expect, beforeEach } from 'vitest';
import { profileSupplier } from '../src/lib/commerce/intelligence/supplier-intelligence';
import {
  recordCompetitorSnapshot,
  getCompetitorHistory,
  getCompetitorCount,
  getAvgAdIntensity,
} from '../src/lib/commerce/intelligence/competitor-intelligence';
import {
  recordAdMetrics,
  recommendAdAction,
  getAverageRoas,
  getActiveCampaignCount,
} from '../src/lib/commerce/intelligence/ad-optimizer';
import type { DiscoveredProduct } from '../src/lib/commerce/intelligence/types';

function makeProduct(o: Partial<DiscoveredProduct> = {}): DiscoveredProduct {
  return {
    id: crypto.randomUUID(),
    source: 'csv',
    title: 'X',
    price: 40,
    cost: 12,
    currency: 'TRY',
    images: [],
    metadata: {},
    discoveredAt: new Date().toISOString(),
    ...o,
  };
}

describe('Supplier Intelligence', () => {
  it('hızlı ülke + kısa kargo → high reliability', () => {
    const s = profileSupplier(
      makeProduct({ supplierName: 'FastCo', supplierCountry: 'Türkiye', shippingDays: 5 }),
    );
    expect(s.reliability).toBe('high');
    expect(s.riskScore).toBeLessThan(35);
  });

  it('belirsiz ülke + uzun kargo → low reliability', () => {
    const s = profileSupplier(makeProduct({ supplierCountry: 'unknown', shippingDays: 30 }));
    expect(s.reliability).toBe('low');
    expect(s.riskScore).toBeGreaterThan(60);
  });

  it('rating risk tersinden türetilir', () => {
    const low = profileSupplier(
      makeProduct({ supplierCountry: 'Türkiye', shippingDays: 5, supplierName: 'A' }),
    );
    const high = profileSupplier(makeProduct({ supplierCountry: 'unknown', shippingDays: 40 }));
    expect(low.rating).toBeGreaterThan(high.rating);
  });
});

describe('Competitor Intelligence', () => {
  it('snapshot kaydeder + history döner', () => {
    recordCompetitorSnapshot({
      competitor: 'RakipA',
      productTitle: 'Kulaklık',
      price: 300,
      discountPercent: 0,
      inStock: true,
      adIntensity: 40,
    });
    recordCompetitorSnapshot({
      competitor: 'RakipA',
      productTitle: 'Kulaklık',
      price: 280,
      discountPercent: 7,
      inStock: true,
      adIntensity: 60,
    });
    const h = getCompetitorHistory('RakipA', 'Kulaklık');
    expect(h).not.toBeNull();
    expect(h!.snapshots.length).toBe(2);
    expect(h!.priceChange).toBe(-20);
  });

  it('fiyat düşüş + reklam artış → aggressive trend', () => {
    recordCompetitorSnapshot({
      competitor: 'RakipB',
      productTitle: 'Mat',
      price: 200,
      discountPercent: 0,
      inStock: true,
      adIntensity: 30,
    });
    recordCompetitorSnapshot({
      competitor: 'RakipB',
      productTitle: 'Mat',
      price: 150,
      discountPercent: 25,
      inStock: true,
      adIntensity: 80,
    });
    const h = getCompetitorHistory('RakipB', 'Mat');
    expect(h!.trend).toBe('aggressive');
  });

  it('getCompetitorCount + getAvgAdIntensity', () => {
    recordCompetitorSnapshot({
      competitor: 'RakipC',
      productTitle: 'Lamba',
      price: 90,
      discountPercent: 0,
      inStock: true,
      adIntensity: 50,
    });
    expect(getCompetitorCount('Lamba')).toBeGreaterThanOrEqual(1);
    expect(getAvgAdIntensity('Lamba')).toBeGreaterThan(0);
  });
});

describe('Ad Optimizer', () => {
  beforeEach(() => {
    // her test bağımsız — global metrikler birikir ama yeni campaign id kullanılır
  });

  it('metrikleri hesaplar (CTR/CPC/ROAS/CPA)', () => {
    const m = recordAdMetrics({
      campaignId: `c-${Date.now()}`,
      platform: 'meta',
      impressions: 10000,
      clicks: 200,
      spend: 100,
      conversions: 10,
      revenue: 300,
    });
    expect(m.ctr).toBe(2); // 200/10000 * 100
    expect(m.cpc).toBe(0.5); // 100/200
    expect(m.roas).toBe(3); // 300/100
    expect(m.cpa).toBe(10); // 100/10
  });

  it('güçlü ROAS → increase_budget + requiresApproval (para)', () => {
    const m = recordAdMetrics({
      campaignId: `win-${Date.now()}`,
      platform: 'meta',
      impressions: 10000,
      clicks: 300,
      spend: 100,
      conversions: 20,
      revenue: 400,
    });
    const rec = recommendAdAction(m);
    expect(rec.action).toBe('increase_budget');
    expect(rec.requiresApproval).toBe(true);
  });

  it('ROAS < 1 → pause_ad + requiresApproval', () => {
    const m = recordAdMetrics({
      campaignId: `lose-${Date.now()}`,
      platform: 'google',
      impressions: 5000,
      clicks: 100,
      spend: 200,
      conversions: 2,
      revenue: 100,
    });
    const rec = recommendAdAction(m);
    expect(rec.action).toBe('pause_ad');
    expect(rec.requiresApproval).toBe(true);
  });

  it('düşük CTR → change_creative', () => {
    const m = recordAdMetrics({
      campaignId: `ctr-${Date.now()}`,
      platform: 'tiktok',
      impressions: 100000,
      clicks: 300,
      spend: 50,
      conversions: 5,
      revenue: 90,
    });
    const rec = recommendAdAction(m);
    expect(rec.action).toBe('change_creative');
  });

  it('getAverageRoas + getActiveCampaignCount', () => {
    expect(getAverageRoas()).toBeGreaterThanOrEqual(0);
    expect(getActiveCampaignCount()).toBeGreaterThan(0);
  });
});
