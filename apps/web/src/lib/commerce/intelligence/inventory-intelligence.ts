import type { InventoryStatus, InventoryReport } from './types';
import { getCommerceOverview } from '../commerce-service';

// Inventory Intelligence — stok/kritik stok/otomatik uyarı/yeniden sipariş önerisi.
// Mevcut commerce-service (migration 009 products) reuse.

const DEFAULT_CRITICAL_THRESHOLD = 5;
// Günlük ortalama satış proxy'si (gerçek sipariş verisi yoksa) — reorder hesabı için
const ASSUMED_DAILY_SALES = 2;

export async function getInventoryReport(
  criticalThreshold = DEFAULT_CRITICAL_THRESHOLD,
): Promise<InventoryReport> {
  const commerce = await getCommerceOverview(200).catch(() => null);
  const products = commerce?.products ?? [];

  const items: InventoryStatus[] = products.map((p) => {
    const isCritical = p.inventoryQuantity <= criticalThreshold;
    const daysUntilStockout =
      ASSUMED_DAILY_SALES > 0 ? Math.round(p.inventoryQuantity / ASSUMED_DAILY_SALES) : null;
    // Reorder: 30 günlük stok hedefi - mevcut
    const targetStock = ASSUMED_DAILY_SALES * 30;
    const reorderSuggestion = isCritical ? Math.max(0, targetStock - p.inventoryQuantity) : 0;

    return {
      productId: p.id,
      title: p.title,
      quantity: p.inventoryQuantity,
      criticalThreshold,
      isCritical,
      reorderSuggestion,
      daysUntilStockout,
    };
  });

  return {
    items,
    criticalCount: items.filter((i) => i.isCritical).length,
    reorderCount: items.filter((i) => i.reorderSuggestion > 0).length,
    generatedAt: new Date().toISOString(),
  };
}
