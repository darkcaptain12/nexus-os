// Commerce Intelligence v1.0 — para kazandıran ürün zekâsı tipleri (Sprint 19)
// Yeni zekâ katmanı: mevcut Executive/Agent/Action/Approval/Knowledge/Memory reuse.

export type ProductSource =
  | 'shopify'
  | 'printify'
  | 'zendrop'
  | 'aliexpress'
  | 'cj-dropshipping'
  | 'csv'
  | 'custom';

export type AdPlatform = 'meta' | 'google' | 'tiktok';

// ─── Discovery ───────────────────────────────────────────────────────────────

export interface DiscoveredProduct {
  id: string;
  source: ProductSource;
  externalId?: string;
  title: string;
  description?: string;
  price: number;
  cost: number;
  currency: string;
  category?: string;
  images: string[];
  supplierName?: string;
  supplierCountry?: string;
  shippingDays?: number;
  metadata: Record<string, unknown>;
  discoveredAt: string;
}

export interface DiscoveryProvider {
  name: ProductSource;
  /** İstemci/API-key ile ham ürün verisi çeker; yoksa boş döner (graceful) */
  fetchProducts(query: ProductDiscoveryQuery): Promise<DiscoveredProduct[]>;
  configured(): boolean;
}

export interface ProductDiscoveryQuery {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

// ─── Scoring (10 faktör → 0-100 Commerce Score) ──────────────────────────────

export interface ScoreFactor {
  name: string;
  value: number; // 0-100
  weight: number;
  contribution: number;
  reasoning: string;
}

export interface CommerceScore {
  productId: string;
  title: string;
  total: number; // 0-100
  verdict: 'winner' | 'promising' | 'risky' | 'avoid';
  factors: ScoreFactor[];
  estimatedMargin: number;
  estimatedProfit: number;
  executiveConfidence: number;
  scoredAt: string;
}

// ─── Competitor Intelligence ─────────────────────────────────────────────────

export interface CompetitorSnapshot {
  competitor: string;
  productTitle: string;
  price: number;
  discountPercent: number;
  inStock: boolean;
  adIntensity: number; // 0-100
  imageHash?: string;
  seoScore?: number;
  capturedAt: string;
}

export interface CompetitorHistory {
  competitor: string;
  productTitle: string;
  snapshots: CompetitorSnapshot[];
  priceChange: number;
  trend: 'aggressive' | 'stable' | 'retreating';
}

// ─── Supplier Intelligence ───────────────────────────────────────────────────

export interface SupplierProfile {
  name: string;
  country: string;
  shippingDays: number;
  costPerUnit: number;
  rating: number; // 0-5
  riskScore: number; // 0-100 (yüksek = riskli)
  reliability: 'high' | 'medium' | 'low';
  reasoning: string[];
}

// ─── Product Queue (Hunter çıktısı) ──────────────────────────────────────────

export type QueueStatus = 'pending' | 'approved' | 'published' | 'rejected';

export interface QueuedProduct {
  id: string;
  product: DiscoveredProduct;
  score: CommerceScore;
  supplier: SupplierProfile | null;
  status: QueueStatus;
  approvalId?: string;
  queuedAt: string;
}

// ─── Creative Intelligence ───────────────────────────────────────────────────

export interface CreativeBrief {
  productId: string;
  hooks: string[];
  headlines: string[];
  descriptions: string[];
  imagePrompts: string[];
  videoScenario: string;
  ugcIdeas: string[];
  thumbnailPrompt: string;
  bannerPrompt: string;
  generatedAt: string;
}

// ─── Advertising Intelligence ────────────────────────────────────────────────

export interface AdCampaignPlan {
  id: string;
  platform: AdPlatform;
  productId: string;
  campaignName: string;
  objective: string;
  adSets: {
    name: string;
    audience: string;
    dailyBudget: number;
    placements: string[];
  }[];
  creative: { headline: string; primaryText: string; callToAction: string };
  pixelEvent: string;
  totalDailyBudget: number;
  requiresApproval: true;
  createdAt: string;
}

// ─── Ad Optimizer ────────────────────────────────────────────────────────────

export interface AdMetrics {
  campaignId: string;
  platform: AdPlatform;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  capturedAt: string;
}

export type AdRecommendationAction =
  | 'increase_budget'
  | 'pause_ad'
  | 'change_creative'
  | 'change_audience'
  | 'keep';

export interface AdRecommendation {
  campaignId: string;
  action: AdRecommendationAction;
  reasoning: string;
  confidence: number;
  requiresApproval: boolean;
  metrics: Pick<AdMetrics, 'roas' | 'cpa' | 'ctr'>;
}

// ─── Revenue Intelligence ────────────────────────────────────────────────────

export interface RevenueMetrics {
  revenue: number;
  profit: number;
  roas: number;
  ltv: number;
  cac: number;
  aov: number;
  conversionRate: number;
  refundRate: number;
  currency: string;
  generatedAt: string;
}

// ─── Inventory Intelligence ──────────────────────────────────────────────────

export interface InventoryStatus {
  productId: string;
  title: string;
  quantity: number;
  criticalThreshold: number;
  isCritical: boolean;
  reorderSuggestion: number;
  daysUntilStockout: number | null;
}

export interface InventoryReport {
  items: InventoryStatus[];
  criticalCount: number;
  reorderCount: number;
  generatedAt: string;
}

// ─── Commerce Dashboard ──────────────────────────────────────────────────────

export interface CommerceIntelligenceDashboard {
  revenue: RevenueMetrics;
  orders: { total: number; pending: number };
  products: { total: number; active: number };
  ads: { activeCampaigns: number; averageRoas: number };
  hunterQueue: { pending: number; approved: number; topScore: number };
  supplierHealth: { averageRating: number; highRiskCount: number };
  executiveRecommendation: string;
  alerts: { kind: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
  generatedAt: string;
}
