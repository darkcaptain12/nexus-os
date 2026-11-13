// AI Automation & Personal Optimization v1.0 — tipler (Sprint 23)
// APEX kendi performansını ölçüp geliştirir. Katman Executive üstüne kurulur;
// mevcut decision-history/agent-store/live-trading/commerce/workflow/Memory/KG
// REUSE eder. Yeni AI motoru YOK — mevcut motorları genişletir.
// Hiçbir gelir etkileyen işlem otomatik yapılmaz; yalnız ÖNERİ üretilir.

// ─── Self Review ─────────────────────────────────────────────────────────────

export type ReviewVerdict = 'correct' | 'wrong' | 'cancelled' | 'pending';

export interface ReviewedDecision {
  id: string;
  decision: string;
  category: string;
  confidence: number;
  verdict: ReviewVerdict;
  reasoning: string;
  at: string;
}

export interface FailureItem {
  domain: 'workflow' | 'trade' | 'ad' | 'agent' | 'decision';
  ref: string;
  title: string;
  detail: string;
  at: string;
}

export interface ExecutiveSelfReview {
  date: string;
  totalDecisions: number;
  correct: number;
  wrong: number;
  cancelled: number;
  pending: number;
  accuracy: number; // resolved kararlarda doğru oranı (0-100)
  failures: FailureItem[];
  summary: string;
  generatedAt: string;
}

// ─── Learning Engine ─────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  domain: FailureItem['domain'];
  ref: string;
  cause: string; // neden başarısız oldu
  recurrenceRisk: 'low' | 'medium' | 'high'; // tekrar eder mi
  prevention: string; // nasıl önlenir
  createdAt: string;
}

export interface LearningReport {
  lessons: Lesson[];
  totalLessons: number;
  highRiskCount: number;
  byDomain: Record<string, number>;
  topInsight: string;
  generatedAt: string;
}

// ─── Goal Engine ─────────────────────────────────────────────────────────────

export type GoalMetric =
  | 'net_profit'
  | 'products_published'
  | 'trading_analyses'
  | 'roas'
  | 'agent_success_rate'
  | 'workflow_completions';

export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

export interface Goal {
  id: string;
  label: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
  createdAt: string;
}

export interface GoalProgress {
  goal: Goal;
  current: number;
  target: number;
  percent: number; // 0-100 (aşabilir → 100'de kırpılır gösterimde)
  status: 'on-track' | 'behind' | 'achieved' | 'at-risk';
  gap: number;
}

// ─── Optimizer Recommendations ───────────────────────────────────────────────
// Tüm optimizer'lar yalnız ÖNERİ döner. Gelir etkileyen aksiyon Approval Queue
// üzerinden ilerler; bu katman ASLA otomatik uygulamaz.

export type RecommendationImpact = 'low' | 'medium' | 'high' | 'critical';

export interface OptimizerRecommendation {
  id: string;
  domain: 'revenue' | 'trading' | 'commerce' | 'agent' | 'workflow';
  action: string; // ör. "Kârsız ürünü kaldır", "Düşük performanslı stratejiyi pasifle"
  target: string; // hangi ürün/strateji/agent/workflow
  rationale: string;
  impact: RecommendationImpact;
  requiresApproval: boolean; // gelir etkileyen → true
  metrics: Record<string, number | string>;
  generatedAt: string;
}

// ─── Trading Optimizer ───────────────────────────────────────────────────────

export interface StrategyPerformance {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number; // gross profit / gross loss
  sharpeLike: number; // ortalama getiri / std sapma
  maxDrawdownPercent: number;
  avgTradeMinutes: number;
  totalPnl: number;
  verdict: 'promote' | 'keep' | 'demote';
}

// ─── Commerce Optimizer ──────────────────────────────────────────────────────

export interface ProductPerformance {
  product: string;
  sales: number;
  adSpend: number;
  roas: number;
  marginPercent: number;
  refundRate: number;
  action: 'scale' | 'keep' | 'raise-price' | 'lower-price' | 'boost-ad' | 'pause-ad' | 'remove';
  rationale: string;
}

// ─── Agent / Workflow Optimizer ──────────────────────────────────────────────

export interface AgentPerformance {
  total: number;
  successRate: number;
  avgRuntimeMs: number;
  avgApprovalWaitMs: number;
  errorRate: number;
  waitingApproval: number;
  bottleneck: string | null;
}

export interface WorkflowPerformance {
  totalWorkflows: number;
  enabledWorkflows: number;
  totalExecutions: number;
  failureRate: number;
  slowestWorkflow: { id: string; name: string; avgDurationMs: number } | null;
  redundantSteps: { workflow: string; step: string; reason: string }[];
  automationSuggestions: string[];
}

// ─── Intelligence Score ──────────────────────────────────────────────────────

export interface IntelligenceScore {
  overall: number; // 0-100
  dimensions: {
    trading: number;
    commerce: number;
    workflow: number;
    agent: number;
    productivity: number;
    learning: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  generatedAt: string;
}

// ─── CEO Report ──────────────────────────────────────────────────────────────

export interface WeeklyCeoReport {
  weekStart: string;
  weekEnd: string;
  earnings: { tradingPnl: number; commerceProfit: number; total: number; currency: string };
  losses: { failedTrades: number; failedAds: number; failedWorkflows: number };
  bestDecision: string;
  worstDecision: string;
  lessons: string[];
  nextWeekPlan: string[];
  risks: string[];
  recommendations: string[];
  intelligenceScore: number;
  generatedAt: string;
}

export interface MonthlyReview {
  month: string; // YYYY-MM
  totalRevenue: number;
  totalProfit: number;
  currency: string;
  trading: {
    totalPnl: number;
    winRate: number;
    bestStrategy: string | null;
    worstStrategy: string | null;
  };
  commerce: { revenue: number; roas: number; bestProduct: string | null };
  topStrategies: string[];
  worstStrategies: string[];
  intelligenceScore: number;
  generatedAt: string;
}
