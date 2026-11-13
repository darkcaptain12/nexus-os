import { describe, it, expect } from 'vitest';
import {
  commerceDashboard,
  commerceRevenue,
  commerceInventory,
  commerceHunt,
  commerceLoadCsv,
} from '../src/lib/commerce/intelligence/services/commerce-intelligence-service';
import { getRevenueMetrics } from '../src/lib/commerce/intelligence/revenue-intelligence';
import { getInventoryReport } from '../src/lib/commerce/intelligence/inventory-intelligence';
import { mobileCommerceIntelligence } from '../src/lib/mobile/services/mobile-service';

describe('Commerce Intelligence Service — facade', () => {
  it('commerceDashboard tüm bölümleri döner', async () => {
    const d = await commerceDashboard();
    expect(d).toHaveProperty('revenue');
    expect(d).toHaveProperty('orders');
    expect(d).toHaveProperty('ads');
    expect(d).toHaveProperty('hunterQueue');
    expect(d).toHaveProperty('supplierHealth');
    expect(d.executiveRecommendation.length).toBeGreaterThan(0);
    expect(Array.isArray(d.alerts)).toBe(true);
  });

  it('Executive önerisi durum tabanlı', async () => {
    const d = await commerceDashboard();
    expect(typeof d.executiveRecommendation).toBe('string');
  });

  it('commerceRevenue metrikleri (ROAS/LTV/CAC/AOV)', async () => {
    const r = await commerceRevenue();
    expect(r).toHaveProperty('roas');
    expect(r).toHaveProperty('ltv');
    expect(r).toHaveProperty('cac');
    expect(r).toHaveProperty('aov');
    expect(r).toHaveProperty('refundRate');
    expect(r.currency).toBeTruthy();
  });

  it('commerceInventory rapor döner', async () => {
    const inv = await commerceInventory();
    expect(inv).toHaveProperty('criticalCount');
    expect(inv).toHaveProperty('reorderCount');
    expect(Array.isArray(inv.items)).toBe(true);
  });

  it('hunt facade üzerinden çalışır', async () => {
    commerceLoadCsv('title,price,cost\nFacade Ürün,50,15');
    const result = await commerceHunt({ count: 2 });
    expect(result.queued.length).toBeGreaterThan(0);
  });
});

describe('Revenue + Inventory — commerce-service reuse', () => {
  it('getRevenueMetrics Supabase yoksa graceful (0)', async () => {
    const r = await getRevenueMetrics();
    expect(r.revenue).toBeGreaterThanOrEqual(0);
    expect(r.roas).toBeGreaterThanOrEqual(0);
  });

  it('getInventoryReport graceful', async () => {
    const inv = await getInventoryReport();
    expect(inv.items).toBeDefined();
  });
});

describe('Mobile entegrasyonu — Commerce Intelligence', () => {
  it('mobileCommerceIntelligence commerce dashboard reuse eder', async () => {
    const d = await mobileCommerceIntelligence();
    expect(d).toHaveProperty('revenue');
    expect(d).toHaveProperty('hunterQueue');
    // düz JSON — mobil sözleşme
    expect(() => JSON.stringify(d)).not.toThrow();
  });
});
