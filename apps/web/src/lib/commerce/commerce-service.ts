import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/health';

// Commerce Service — migration 009 (shops/products/commerce_orders) üstünde
// gerçek okuma katmanı. Supabase yapılandırılmamışsa graceful degradation
// (boş döner) — tüm uygulamanın mock-Supabase davranışıyla tutarlı.
// Mobil Commerce facade'ı bu servisi reuse eder. Placeholder/mock YOK.

export interface CommerceOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

export interface CommerceProductSummary {
  id: string;
  title: string;
  price: number;
  currency: string;
  inventoryQuantity: number;
  status: string;
}

export interface CommerceAlert {
  kind: 'low_stock' | 'pending_order' | 'refund';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CommerceOverview {
  configured: boolean;
  orders: CommerceOrderSummary[];
  products: CommerceProductSummary[];
  metrics: {
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
    estimatedProfit: number;
    lowStockCount: number;
    currency: string;
  };
  alerts: CommerceAlert[];
  generatedAt: string;
}

const EMPTY: Omit<CommerceOverview, 'generatedAt'> = {
  configured: false,
  orders: [],
  products: [],
  metrics: {
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0,
    estimatedProfit: 0,
    lowStockCount: 0,
    currency: 'TRY',
  },
  alerts: [],
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  title: string;
  price: number;
  cost: number | null;
  currency: string;
  inventory_quantity: number;
  status: string;
}

const LOW_STOCK_THRESHOLD = 5;

export async function getCommerceOverview(limit = 20): Promise<CommerceOverview> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    return { ...EMPTY, generatedAt: now };
  }

  const supabase = await createClient();

  const [ordersRes, productsRes]: [OrderRow[], ProductRow[]] = await Promise.all([
    supabase
      .from('commerce_orders')
      .select('id, order_number, status, total, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then((r: { data: OrderRow[] | null }) => r.data ?? [])
      .catch(() => [] as OrderRow[]),
    supabase
      .from('products')
      .select('id, title, price, cost, currency, inventory_quantity, status')
      .is('deleted_at', null)
      .limit(limit)
      .then((r: { data: ProductRow[] | null }) => r.data ?? [])
      .catch(() => [] as ProductRow[]),
  ]);

  const orders: CommerceOrderSummary[] = ordersRes.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    total: Number(o.total),
    currency: o.currency,
    createdAt: o.created_at,
  }));

  const products: CommerceProductSummary[] = productsRes.map((p) => ({
    id: p.id,
    title: p.title,
    price: Number(p.price),
    currency: p.currency,
    inventoryQuantity: p.inventory_quantity,
    status: p.status,
  }));

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing',
  ).length;
  // Gerçek kâr tahmini: sipariş toplamı - ürün maliyeti oranı (elde varsa)
  const avgMargin = productsRes.length
    ? productsRes.reduce((s, p) => s + (p.cost && p.price ? 1 - p.cost / p.price : 0.3), 0) /
      productsRes.length
    : 0.3;
  const estimatedProfit = Number((revenue * avgMargin).toFixed(2));
  const lowStock = products.filter(
    (p) => p.inventoryQuantity <= LOW_STOCK_THRESHOLD && p.status === 'active',
  );

  const alerts: CommerceAlert[] = [];
  if (lowStock.length > 0) {
    alerts.push({
      kind: 'low_stock',
      message: `${lowStock.length} ürün stok azaldı`,
      severity: 'warning',
    });
  }
  if (pendingOrders > 0) {
    alerts.push({
      kind: 'pending_order',
      message: `${pendingOrders} bekleyen sipariş`,
      severity: 'info',
    });
  }

  return {
    configured: true,
    orders,
    products,
    metrics: {
      totalOrders: orders.length,
      pendingOrders,
      revenue: Number(revenue.toFixed(2)),
      estimatedProfit,
      lowStockCount: lowStock.length,
      currency: orders[0]?.currency ?? products[0]?.currency ?? 'TRY',
    },
    alerts,
    generatedAt: now,
  };
}
