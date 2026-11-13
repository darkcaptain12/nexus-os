import type { DiscoveredProduct, SupplierProfile } from './types';

// Supplier Intelligence — ürün için tedarikçi profili: kargo/risk/ülke/puan/maliyet.
// Saf skorlama; ülke ve kargo süresinden risk türetir.

const HIGH_RISK_COUNTRIES = new Set(['unknown', 'bilinmeyen']);
const FAST_COUNTRIES = new Set(['türkiye', 'turkey', 'tr', 'germany', 'almanya', 'usa', 'us']);

export function profileSupplier(product: DiscoveredProduct): SupplierProfile {
  const name = product.supplierName ?? 'Bilinmeyen Tedarikçi';
  const country = product.supplierCountry ?? 'unknown';
  const shippingDays = product.shippingDays ?? 15;
  const costPerUnit = product.cost;

  const reasoning: string[] = [];
  let riskScore = 30;

  const countryLc = country.toLocaleLowerCase('tr');
  if (HIGH_RISK_COUNTRIES.has(countryLc)) {
    riskScore += 30;
    reasoning.push('Tedarikçi ülkesi belirsiz — risk yüksek');
  } else if (FAST_COUNTRIES.has(countryLc)) {
    riskScore -= 10;
    reasoning.push('Hızlı kargo ülkesi');
  }

  if (shippingDays > 20) {
    riskScore += 25;
    reasoning.push(`Uzun kargo süresi (${shippingDays} gün) — iade riski`);
  } else if (shippingDays <= 7) {
    riskScore -= 10;
    reasoning.push('Hızlı teslim');
  }

  if (!product.supplierName) {
    riskScore += 15;
    reasoning.push('Tedarikçi adı yok — doğrulama gerekli');
  }

  riskScore = Math.max(0, Math.min(100, riskScore));
  // Rating: risk tersinden türetilir (gerçek rating verisi yoksa)
  const rating = Number((5 - (riskScore / 100) * 3).toFixed(1));
  const reliability: SupplierProfile['reliability'] =
    riskScore < 35 ? 'high' : riskScore < 60 ? 'medium' : 'low';

  return { name, country, shippingDays, costPerUnit, rating, riskScore, reliability, reasoning };
}
