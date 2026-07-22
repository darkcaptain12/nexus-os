import type {
  DiscoveryProvider,
  DiscoveredProduct,
  ProductDiscoveryQuery,
  ProductSource,
} from './types';

// Product Discovery Engine — pluggable provider registry (exchange/OCR/STT
// pattern). Shopify/Printify/Zendrop/AliExpress/CJ ham veri çekimi istemci veya
// API-key ile; yapılandırılmamışsa graceful boş döner. CSV provider gerçek parse.

const g = globalThis as unknown as {
  __apexDiscoveryProviders?: Map<ProductSource, DiscoveryProvider>;
};

// CSV Provider — gerçek parse (başlık satırı + satırlar → DiscoveredProduct).
export function parseCsvProducts(csv: string): DiscoveredProduct[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const titleI = idx('title') !== -1 ? idx('title') : idx('name');
  const priceI = idx('price');
  const costI = idx('cost');

  const products: DiscoveredProduct[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const title = cells[titleI]?.trim();
    if (!title) continue;
    const price = parseFloat(cells[priceI]?.trim() ?? '0') || 0;
    const cost = parseFloat(cells[costI]?.trim() ?? '0') || price * 0.4;
    products.push({
      id: crypto.randomUUID(),
      source: 'csv',
      title,
      price,
      cost,
      currency: cells[idx('currency')]?.trim() || 'TRY',
      category: cells[idx('category')]?.trim(),
      description: cells[idx('description')]?.trim(),
      images: cells[idx('image')]?.trim() ? [cells[idx('image')]!.trim()] : [],
      supplierName: cells[idx('supplier')]?.trim(),
      supplierCountry: cells[idx('country')]?.trim(),
      shippingDays: cells[idx('shipping_days')]
        ? parseInt(cells[idx('shipping_days')]!, 10)
        : undefined,
      metadata: {},
      discoveredAt: new Date().toISOString(),
    });
  }
  return products;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

const g2 = globalThis as unknown as { __apexCsvBuffer?: string };

const csvProvider: DiscoveryProvider = {
  name: 'csv',
  configured() {
    return Boolean(g2.__apexCsvBuffer);
  },
  async fetchProducts(query: ProductDiscoveryQuery): Promise<DiscoveredProduct[]> {
    if (!g2.__apexCsvBuffer) return [];
    let products = parseCsvProducts(g2.__apexCsvBuffer);
    if (query.keyword) {
      const kw = query.keyword.toLocaleLowerCase('tr');
      products = products.filter((p) => p.title.toLocaleLowerCase('tr').includes(kw));
    }
    if (query.minPrice !== undefined) products = products.filter((p) => p.price >= query.minPrice!);
    if (query.maxPrice !== undefined) products = products.filter((p) => p.price <= query.maxPrice!);
    return products.slice(0, query.limit ?? 50);
  },
};

/** CSV verisini yükle (Manuel CSV kaynağı — istemci upload eder). */
export function loadCsvSource(csv: string): number {
  g2.__apexCsvBuffer = csv;
  return parseCsvProducts(csv).length;
}

// Dış provider slotları (Shopify/Printify/Zendrop/AliExpress/CJ) — API-key
// bağlanana kadar configured=false, graceful boş. registerDiscoveryProvider ile
// gerçek implementasyon bağlanır.
function makeStubProvider(name: ProductSource): DiscoveryProvider {
  return {
    name,
    configured: () => false,
    async fetchProducts() {
      return []; // API-key/istemci bağlanmadı — boş (mock değil, graceful)
    },
  };
}

function registry(): Map<ProductSource, DiscoveryProvider> {
  if (!g.__apexDiscoveryProviders) {
    g.__apexDiscoveryProviders = new Map();
    g.__apexDiscoveryProviders.set('csv', csvProvider);
    for (const src of [
      'shopify',
      'printify',
      'zendrop',
      'aliexpress',
      'cj-dropshipping',
    ] as ProductSource[]) {
      g.__apexDiscoveryProviders.set(src, makeStubProvider(src));
    }
  }
  return g.__apexDiscoveryProviders;
}

export function registerDiscoveryProvider(provider: DiscoveryProvider): void {
  registry().set(provider.name, provider);
}

export function getDiscoveryProvider(source: ProductSource): DiscoveryProvider {
  const p = registry().get(source);
  if (!p) throw new Error(`Bilinmeyen discovery kaynağı: ${source}`);
  return p;
}

export function listDiscoveryProviders(): { name: ProductSource; configured: boolean }[] {
  return [...registry().values()].map((p) => ({ name: p.name, configured: p.configured() }));
}

/** Tüm yapılandırılmış kaynaklardan ürün keşfet (birleşik). */
export async function discoverProducts(query: ProductDiscoveryQuery): Promise<DiscoveredProduct[]> {
  const providers = [...registry().values()].filter((p) => p.configured());
  const results = await Promise.all(providers.map((p) => p.fetchProducts(query).catch(() => [])));
  return results.flat().slice(0, query.limit ?? 50);
}
