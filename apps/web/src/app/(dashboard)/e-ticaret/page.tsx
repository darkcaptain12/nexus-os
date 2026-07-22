import { Suspense } from 'react';
import Link from 'next/link';
import { ShoppingBag, Package, TrendingUp, AlertTriangle, Wrench } from 'lucide-react';
import { getCommerceOverview } from '@/lib/commerce/commerce-service';

export const metadata = { title: 'E-Ticaret — NEXUS OS' };

const SEV_COLOR: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

async function CommerceContent() {
  const overview = await getCommerceOverview(20);

  if (!overview.configured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <ShoppingBag className="text-muted-foreground/30 mb-4 h-12 w-12" />
        <h1 className="text-foreground text-xl font-semibold">E-Ticaret</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          Commerce veritabanı bağlantısı yapılandırılmamış. Ürün/sipariş verisi için kurulum
          gerekli.
        </p>
        <Link
          href="/kurulum"
          className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Wrench className="h-4 w-4" /> Kuruluma Git
        </Link>
      </div>
    );
  }

  const m = overview.metrics;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="text-primary h-6 w-6" />
        <h1 className="text-foreground text-2xl font-bold">E-Ticaret</h1>
      </div>

      {/* Metrikler */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Toplam Sipariş', value: String(m.totalOrders) },
          { label: 'Bekleyen', value: String(m.pendingOrders) },
          { label: 'Gelir', value: `${m.revenue.toLocaleString('tr-TR')} ${m.currency}` },
          {
            label: 'Tahmini Kâr',
            value: `${m.estimatedProfit.toLocaleString('tr-TR')} ${m.currency}`,
          },
        ].map((k) => (
          <div key={k.label} className="border-border bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{k.label}</p>
            <p className="text-foreground mt-1 text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Uyarılar */}
      {overview.alerts.length > 0 && (
        <div className="border-border bg-card rounded-xl border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Uyarılar
          </h2>
          <ul className="space-y-1.5">
            {overview.alerts.map((a, i) => (
              <li key={i} className={`text-sm ${SEV_COLOR[a.severity] ?? 'text-muted-foreground'}`}>
                • {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ürünler */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4" /> Ürünler ({overview.products.length})
          </h2>
          {overview.products.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ürün yok. Shopify/PayTR entegrasyonu bağlanınca burada listelenir.
            </p>
          ) : (
            <ul className="space-y-2">
              {overview.products.slice(0, 10).map((p) => (
                <li
                  key={p.id}
                  className="bg-muted/30 flex items-center justify-between rounded-lg p-2.5 text-sm"
                >
                  <span className="text-foreground truncate">{p.title}</span>
                  <span className="text-muted-foreground shrink-0">
                    {p.price} {p.currency} · stok {p.inventoryQuantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Siparişler */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" /> Son Siparişler ({overview.orders.length})
          </h2>
          {overview.orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sipariş yok.</p>
          ) : (
            <ul className="space-y-2">
              {overview.orders.slice(0, 10).map((o) => (
                <li
                  key={o.id}
                  className="bg-muted/30 flex items-center justify-between rounded-lg p-2.5 text-sm"
                >
                  <span className="text-foreground">{o.orderNumber}</span>
                  <span className="text-muted-foreground">
                    {o.total} {o.currency} · {o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommercePage() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground p-8 text-sm">E-ticaret yükleniyor…</div>}
    >
      <CommerceContent />
    </Suspense>
  );
}
