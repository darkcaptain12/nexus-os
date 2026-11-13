import type { DiscoveredProduct, CommerceScore, ScoreFactor } from './types';

// Product Scoring — 10 faktörlü Commerce Score (0-100). Saf, deterministik.
// Executive Confidence faktörü mevcut risk/productivity mantığıyla hizalı.

interface FactorConfig {
  name: string;
  weight: number;
  compute: (p: DiscoveredProduct, ctx: ScoringContext) => { value: number; reasoning: string };
}

export interface ScoringContext {
  /** Rakip sayısı (competitor-intelligence'tan) — saturation/rekabet için */
  competitorCount?: number;
  /** Ortalama rakip reklam yoğunluğu 0-100 */
  avgAdIntensity?: number;
  /** Mevsimsellik ipucu: ay (1-12) */
  month?: number;
  /** Executive risk skoru 0-100 (düşük iyi) */
  executiveRiskScore?: number;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

const FACTORS: FactorConfig[] = [
  {
    name: 'Trend',
    weight: 0.14,
    compute: (p) => {
      // Fiyat aralığı ve kategori popülerliği proxy'si
      const sweetSpot = p.price >= 15 && p.price <= 70; // impulse-buy bandı
      const value = sweetSpot ? 80 : p.price < 15 ? 55 : 45;
      return {
        value,
        reasoning: sweetSpot ? 'İmpuls-satın alma fiyat bandında' : 'Fiyat trend bandı dışında',
      };
    },
  },
  {
    name: 'Rekabet',
    weight: 0.12,
    compute: (_p, ctx) => {
      const count = ctx.competitorCount ?? 5;
      const value = clamp(100 - count * 8); // az rakip = yüksek puan
      return { value, reasoning: `${count} rakip tespit edildi` };
    },
  },
  {
    name: 'Kâr Marjı',
    weight: 0.18,
    compute: (p) => {
      const margin = p.price > 0 ? (p.price - p.cost) / p.price : 0;
      const value = clamp(margin * 140); // %70 marj → ~98
      return { value, reasoning: `Marj %${Math.round(margin * 100)}` };
    },
  },
  {
    name: 'Reklam Maliyeti',
    weight: 0.1,
    compute: (_p, ctx) => {
      const intensity = ctx.avgAdIntensity ?? 40;
      const value = clamp(100 - intensity); // düşük reklam yoğunluğu = ucuz edinme
      return { value, reasoning: `Rakip reklam yoğunluğu ${intensity}/100` };
    },
  },
  {
    name: 'Tedarik Güveni',
    weight: 0.1,
    compute: (p) => {
      const days = p.shippingDays ?? 15;
      const value = clamp(100 - (days - 5) * 4);
      return { value, reasoning: `Kargo ~${days} gün` };
    },
  },
  {
    name: 'Teslim Süresi',
    weight: 0.08,
    compute: (p) => {
      const days = p.shippingDays ?? 15;
      const value = days <= 7 ? 90 : days <= 12 ? 70 : days <= 20 ? 45 : 25;
      return { value, reasoning: `${days} gün teslim` };
    },
  },
  {
    name: 'İade Riski',
    weight: 0.08,
    compute: (p) => {
      // Yüksek fiyat + uzun kargo → yüksek iade riski
      const risk = (p.price > 60 ? 30 : 10) + ((p.shippingDays ?? 15) > 15 ? 30 : 10);
      return { value: clamp(100 - risk), reasoning: `İade riski ${risk}/100` };
    },
  },
  {
    name: 'Mevsimsellik',
    weight: 0.06,
    compute: (p, ctx) => {
      const month = ctx.month ?? new Date().getMonth() + 1;
      const cat = (p.category ?? '').toLocaleLowerCase('tr');
      let value = 65;
      if (/yaz|plaj|güneş|summer/.test(cat) && month >= 5 && month <= 8) value = 90;
      else if (/kış|kar|winter|mont/.test(cat) && (month >= 11 || month <= 2)) value = 90;
      else if (/hediye|gift|yılbaşı/.test(cat) && month === 12) value = 95;
      return { value, reasoning: `Ay ${month}, kategori mevsim uyumu` };
    },
  },
  {
    name: 'Saturation',
    weight: 0.08,
    compute: (_p, ctx) => {
      const count = ctx.competitorCount ?? 5;
      const intensity = ctx.avgAdIntensity ?? 40;
      const saturation = clamp(count * 6 + intensity * 0.4);
      return {
        value: clamp(100 - saturation),
        reasoning: `Pazar doygunluğu ${Math.round(saturation)}/100`,
      };
    },
  },
  {
    name: 'Executive Confidence',
    weight: 0.06,
    compute: (_p, ctx) => {
      const risk = ctx.executiveRiskScore ?? 40;
      return { value: clamp(100 - risk), reasoning: `Executive risk skoru ${risk}/100` };
    },
  },
];

export function scoreProduct(product: DiscoveredProduct, ctx: ScoringContext = {}): CommerceScore {
  const factors: ScoreFactor[] = FACTORS.map((f) => {
    const { value, reasoning } = f.compute(product, ctx);
    return {
      name: f.name,
      value: Math.round(value),
      weight: f.weight,
      contribution: Number((value * f.weight).toFixed(2)),
      reasoning,
    };
  });

  const total = Math.round(factors.reduce((s, f) => s + f.contribution, 0));
  const margin = product.price > 0 ? (product.price - product.cost) / product.price : 0;
  const executiveConfidence = factors.find((f) => f.name === 'Executive Confidence')?.value ?? 50;

  const verdict: CommerceScore['verdict'] =
    total >= 75 ? 'winner' : total >= 60 ? 'promising' : total >= 45 ? 'risky' : 'avoid';

  return {
    productId: product.id,
    title: product.title,
    total,
    verdict,
    factors,
    estimatedMargin: Number((margin * 100).toFixed(1)),
    estimatedProfit: Number((product.price - product.cost).toFixed(2)),
    executiveConfidence,
    scoredAt: new Date().toISOString(),
  };
}

/** Toplu skorla + sırala (en yüksek Commerce Score önce). */
export function scoreProducts(
  products: DiscoveredProduct[],
  ctx: ScoringContext = {},
): CommerceScore[] {
  return products.map((p) => scoreProduct(p, ctx)).sort((a, b) => b.total - a.total);
}
