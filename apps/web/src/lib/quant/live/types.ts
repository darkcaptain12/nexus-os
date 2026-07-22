// Live Trading Automation v1.0 — Paper Trading üstüne canlı katman (Sprint 20)
// Mevcut risk-engine/exchanges/strategy/paper-trading REUSE eder.

import type { ExchangeName } from '../types';

export type LiveOrderType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop_limit'
  | 'oco'
  | 'tp'
  | 'sl'
  | 'trailing_stop';

export type LiveOrderStatus =
  | 'pending-approval'
  | 'approved'
  | 'rejected'
  | 'submitted'
  | 'filled'
  | 'cancelled';

export interface LiveOrderInput {
  exchange: ExchangeName;
  symbol: string;
  side: 'buy' | 'sell';
  type: LiveOrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  trailingPercent?: number;
  leverage?: number;
  reason?: string;
  strategy?: string;
}

export interface LiveOrder {
  id: string;
  input: LiveOrderInput;
  status: LiveOrderStatus;
  approvalExecutionId?: string;
  exchangeOrderId?: string;
  filledPrice: number | null;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Risk Engine v2 ──────────────────────────────────────────────────────────

export interface RiskProfileV2 {
  maxPositionSizePercent: number;
  maxDailyLossPercent: number;
  maxOpenPositions: number;
  maxLeverage: number;
  stopLossRequired: boolean;
  // v2 ek kontroller
  maxSymbolExposurePercent: number;
  maxDailyTrades: number;
  blacklistedSymbols: string[];
  newsBlackoutActive: boolean;
  maxVolatilityAtrPercent: number;
}

export interface RiskCheckV2Result {
  allowed: boolean;
  violations: string[];
  warnings: string[];
  checkedRules: string[];
}

// ─── Position Manager ────────────────────────────────────────────────────────

export interface LivePositionView {
  symbol: string;
  direction: 'long' | 'short';
  quantity: number;
  averageCost: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  margin: number;
  riskScore: number;
}

// ─── Portfolio Intelligence ──────────────────────────────────────────────────

export interface PortfolioIntelligence {
  equity: number;
  balance: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  maxDrawdownPercent: number;
  exposure: number;
  exposurePercent: number;
  allocation: { symbol: string; percent: number; value: number }[];
  openPositionCount: number;
  currency: string;
  generatedAt: string;
}

// ─── Trade Journal ───────────────────────────────────────────────────────────

export interface TradeJournalEntry {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  reason: string;
  aiRationale: string;
  riskScore: number;
  result: 'open' | 'win' | 'loss' | 'breakeven';
  pnl: number;
  strategy?: string; // strateji bazlı performans analizi (Sprint 23 optimizer)
  screenshotRef?: string;
  executiveReview?: string;
  openedAt: string;
  closedAt: string | null;
}

// ─── AI Trade Review ─────────────────────────────────────────────────────────

export interface TradeReview {
  journalId: string;
  symbol: string;
  whyOpened: string;
  whyClosed: string;
  mistake: string | null;
  nextSuggestion: string;
  grade: 'A' | 'B' | 'C' | 'D';
  generatedAt: string;
}

// ─── Live Alerts ─────────────────────────────────────────────────────────────

export type LiveAlertKind =
  | 'position_opened'
  | 'tp_hit'
  | 'sl_hit'
  | 'trailing_update'
  | 'risk_warning'
  | 'margin_call'
  | 'liquidation_risk';

export interface LiveTradingAlert {
  id: string;
  kind: LiveAlertKind;
  symbol: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
}
