import { describe, it, expect } from 'vitest';
import {
  parseCsvProducts,
  loadCsvSource,
  discoverProducts,
  listDiscoveryProviders,
  getDiscoveryProvider,
} from '../src/lib/commerce/intelligence/discovery-registry';

const SAMPLE_CSV = `title,price,cost,currency,category,supplier,country,shipping_days
Kablosuz Kulaklık,299,120,TRY,elektronik,TechSupply,Türkiye,5
Yoga Matı,150,45,TRY,spor,FitCo,China,18
LED Şerit,89,25,TRY,ev,LightCo,Türkiye,7`;

describe('Discovery — CSV Provider (gerçek parse)', () => {
  it('CSV başlık + satırları DiscoveredProduct listesine çevirir', () => {
    const products = parseCsvProducts(SAMPLE_CSV);
    expect(products).toHaveLength(3);
    expect(products[0]!.title).toBe('Kablosuz Kulaklık');
    expect(products[0]!.price).toBe(299);
    expect(products[0]!.cost).toBe(120);
    expect(products[0]!.supplierCountry).toBe('Türkiye');
    expect(products[0]!.shippingDays).toBe(5);
  });

  it("cost yoksa fiyatın %40'ı varsayılır", () => {
    const csv = 'title,price\nÜrün X,100';
    const products = parseCsvProducts(csv);
    expect(products[0]!.cost).toBe(40);
  });

  it('boş/tek satır CSV boş döner', () => {
    expect(parseCsvProducts('')).toHaveLength(0);
    expect(parseCsvProducts('title,price')).toHaveLength(0);
  });

  it('loadCsvSource yüklenen ürün sayısı döner', () => {
    const count = loadCsvSource(SAMPLE_CSV);
    expect(count).toBe(3);
  });

  it('discoverProducts CSV kaynağından çeker', async () => {
    loadCsvSource(SAMPLE_CSV);
    const products = await discoverProducts({ limit: 10 });
    expect(products.length).toBeGreaterThanOrEqual(3);
  });

  it('keyword filtresi çalışır', async () => {
    loadCsvSource(SAMPLE_CSV);
    const products = await discoverProducts({ keyword: 'yoga' });
    expect(products.some((p) => p.title.toLowerCase().includes('yoga'))).toBe(true);
  });

  it('fiyat filtresi çalışır', async () => {
    loadCsvSource(SAMPLE_CSV);
    const products = await discoverProducts({ maxPrice: 100 });
    expect(products.every((p) => p.price <= 100)).toBe(true);
  });
});

describe('Discovery — Provider Registry', () => {
  it('7 kaynak kayıtlı (csv + 5 dış + custom slot)', () => {
    const providers = listDiscoveryProviders();
    const names = providers.map((p) => p.name);
    expect(names).toContain('csv');
    expect(names).toContain('shopify');
    expect(names).toContain('aliexpress');
    expect(names).toContain('cj-dropshipping');
  });

  it('dış provider yapılandırılmamış (graceful)', () => {
    const providers = listDiscoveryProviders();
    const shopify = providers.find((p) => p.name === 'shopify');
    expect(shopify!.configured).toBe(false);
  });

  it('getDiscoveryProvider bilinmeyen kaynak fırlatır', () => {
    // @ts-expect-error test için geçersiz kaynak
    expect(() => getDiscoveryProvider('yok-kaynak')).toThrow();
  });
});
