import type { CompetitorSnapshot, CompetitorHistory } from './types';

// Competitor Intelligence — fiyat/indirim/stok/reklam/görsel/SEO takibi + history.
// Ring buffer (competitor+product başına snapshot geçmişi).

const MAX_SNAPSHOTS = 100;

const g = globalThis as unknown as { __apexCompetitorHistory?: Map<string, CompetitorSnapshot[]> };

function store(): Map<string, CompetitorSnapshot[]> {
  if (!g.__apexCompetitorHistory) g.__apexCompetitorHistory = new Map();
  return g.__apexCompetitorHistory;
}

function key(competitor: string, product: string): string {
  return `${competitor.toLowerCase()}::${product.toLowerCase()}`;
}

export function recordCompetitorSnapshot(
  input: Omit<CompetitorSnapshot, 'capturedAt'>,
): CompetitorSnapshot {
  const snapshot: CompetitorSnapshot = { ...input, capturedAt: new Date().toISOString() };
  const k = key(input.competitor, input.productTitle);
  const s = store();
  const list = s.get(k) ?? [];
  list.push(snapshot);
  if (list.length > MAX_SNAPSHOTS) list.shift();
  s.set(k, list);
  return snapshot;
}

export function getCompetitorHistory(
  competitor: string,
  productTitle: string,
): CompetitorHistory | null {
  const list = store().get(key(competitor, productTitle));
  if (!list || list.length === 0) return null;

  const first = list[0]!;
  const last = list[list.length - 1]!;
  const priceChange = Number((last.price - first.price).toFixed(2));

  // Trend: fiyat düşürüyor + reklam artırıyorsa agresif
  const adRising = last.adIntensity > first.adIntensity;
  const priceDropping = priceChange < 0;
  const trend: CompetitorHistory['trend'] =
    priceDropping && adRising
      ? 'aggressive'
      : last.adIntensity < first.adIntensity
        ? 'retreating'
        : 'stable';

  return { competitor, productTitle, snapshots: list, priceChange, trend };
}

export function getCompetitorCount(productTitle: string): number {
  const kw = productTitle.toLowerCase();
  const competitors = new Set<string>();
  for (const [k] of store()) {
    if (k.includes(kw)) competitors.add(k.split('::')[0]!);
  }
  return competitors.size;
}

export function getAvgAdIntensity(productTitle: string): number {
  const kw = productTitle.toLowerCase();
  const intensities: number[] = [];
  for (const [k, list] of store()) {
    if (k.includes(kw) && list.length > 0) intensities.push(list[list.length - 1]!.adIntensity);
  }
  if (intensities.length === 0) return 40;
  return Math.round(intensities.reduce((s, v) => s + v, 0) / intensities.length);
}
