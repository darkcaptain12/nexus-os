import type { DiscoveredProduct, CreativeBrief } from './types';

// Creative Intelligence — reklam creative brief'i üretir: hook/başlık/açıklama/
// görsel prompt/video senaryo/UGC/thumbnail/banner. Deterministik gerçek üretim.
// Görsel/video ÜRETİMİ mevcut entegrasyonlarla tetiklenir (imagePrompts döner);
// yeni üretim motoru YOK — bu katman brief hazırlar.

function priceHook(product: DiscoveredProduct): string {
  const margin = product.price > 0 ? (product.price - product.cost) / product.price : 0;
  if (margin > 0.6) return `${product.title} — sınırlı stok, kaçırma!`;
  return `${product.title} şimdi ${product.price} ${product.currency}`;
}

export function buildCreativeBrief(product: DiscoveredProduct): CreativeBrief {
  const title = product.title;
  const cat = product.category ?? 'ürün';

  const hooks = [
    priceHook(product),
    `Bunu görmeden ${cat} almayın`,
    `${title}: 3 saniyede neden herkes alıyor?`,
    `Stok bitmeden — ${title}`,
  ];

  const headlines = [
    `${title} — Bugün %${Math.round(((product.price - product.cost) / Math.max(product.price, 1)) * 100)} Değerinde`,
    `Yeni: ${title}`,
    `${cat} kategorisinde #1`,
  ];

  const descriptions = [
    `${title} ile hayatını kolaylaştır. Hızlı kargo, güvenli ödeme. ${product.description?.slice(0, 100) ?? ''}`.trim(),
    `Neden ${title}? Kaliteli, uygun fiyatlı, hızlı teslim. Şimdi sipariş ver.`,
  ];

  const imagePrompts = [
    `${title}, studio lighting, white background, e-commerce product shot, high detail`,
    `${title} in use, lifestyle scene, natural light, happy customer`,
    `${title} flat lay with accessories, top-down, minimal aesthetic`,
  ];

  const videoScenario = [
    `SAHNE 1 (0-3sn): Problem — kullanıcı ${cat} olmadan zorlanıyor. HOOK metni: "${hooks[0]}"`,
    `SAHNE 2 (3-8sn): Çözüm — ${title} tanıtımı, ürün detay çekimleri.`,
    `SAHNE 3 (8-15sn): Sosyal kanıt — kullanıcı yorumları, "${headlines[0]}".`,
    `SAHNE 4 (15-20sn): CTA — "Şimdi sipariş ver, stok sınırlı".`,
  ].join('\n');

  const ugcIdeas = [
    `Unboxing videosu: ${title} kutu açılışı + ilk izlenim`,
    `Öncesi/sonrası: ${title} kullanımının farkı`,
    `Günlük rutin: ${title} nasıl kullanılıyor`,
  ];

  return {
    productId: product.id,
    hooks,
    headlines,
    descriptions,
    imagePrompts,
    videoScenario,
    ugcIdeas,
    thumbnailPrompt: `${title}, bold text overlay "${hooks[0]}", high contrast, thumb-stopping`,
    bannerPrompt: `${title} promotional banner, ${product.price} ${product.currency}, call-to-action button, brand colors`,
    generatedAt: new Date().toISOString(),
  };
}
