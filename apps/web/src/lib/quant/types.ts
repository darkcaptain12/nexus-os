// APEX Quant — Trading Intelligence tipleri (Sprint 14)

export type ExchangeName = 'binance' | 'mexc' | 'bybit' | 'okx';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface Ticker {
  symbol: string;
  lastPrice: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  exchange: ExchangeName;
  fetchedAt: string;
}

// ─── Teknik Analiz ───────────────────────────────────────────────────────────

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

// ─── Smart Money Concepts ────────────────────────────────────────────────────

export type SwingType = 'high' | 'low';

export interface SwingPoint {
  index: number;
  price: number;
  type: SwingType;
}

export type SmcEventType =
  | 'BOS'
  | 'CHoCH'
  | 'ORDER_BLOCK'
  | 'FAIR_VALUE_GAP'
  | 'LIQUIDITY_SWEEP'
  | 'BREAKER_BLOCK'
  | 'MITIGATION_BLOCK';

export interface SmcEvent {
  type: SmcEventType;
  direction: 'bullish' | 'bearish';
  index: number;
  price: number;
  priceHigh?: number;
  priceLow?: number;
  description: string;
}

export interface PremiumDiscount {
  rangeHigh: number;
  rangeLow: number;
  equilibrium: number;
  currentZone: 'premium' | 'discount' | 'equilibrium';
  zonePercent: number;
}

export interface SmcAnalysis {
  swings: SwingPoint[];
  events: SmcEvent[];
  premiumDiscount: PremiumDiscount | null;
  structureBias: 'bullish' | 'bearish' | 'neutral';
}

// ─── AI Analiz ───────────────────────────────────────────────────────────────

export interface MarketScenario {
  name: string;
  direction: 'long' | 'short' | 'neutral';
  probability: number; // 0-100
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  reasoning: string;
}

export interface MarketAnalysis {
  symbol: string;
  timeframe: Timeframe;
  exchange: ExchangeName;
  lastPrice: number;
  trend: { direction: 'up' | 'down' | 'sideways'; strength: number; evidence: string[] };
  momentum: { state: 'bullish' | 'bearish' | 'neutral'; rsi: number; evidence: string[] };
  volatility: { level: 'low' | 'normal' | 'high'; atrPercent: number; evidence: string[] };
  support: number[];
  resistance: number[];
  riskScore: number; // 0-100
  scenarios: MarketScenario[];
  smcSummary: string[];
  generatedBy: 'rule-engine';
  generatedAt: string;
  durationMs: number;
}

// ─── Risk ────────────────────────────────────────────────────────────────────

export interface RiskProfile {
  maxPositionSizePercent: number;
  maxDailyLossPercent: number;
  maxOpenPositions: number;
  maxLeverage: number;
  stopLossRequired: boolean;
}

export interface PositionSizeInput {
  equity: number;
  entryPrice: number;
  stopLoss: number;
  riskPercent: number;
  leverage?: number;
}

export interface PositionSizeResult {
  quantity: number;
  positionValue: number;
  riskAmount: number;
  riskRewardRatio: number | null;
  leveragedExposure: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
}

// ─── Paper Trading ───────────────────────────────────────────────────────────

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type PositionDirection = 'long' | 'short';
export type PositionStatus = 'open' | 'closed';

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number | null;
  quantity: number;
  status: OrderStatus;
  filledPrice: number | null;
  fee: number;
  error?: string;
  createdAt: string;
  filledAt: string | null;
  source: 'manual' | 'agent' | 'strategy';
}

export interface PaperPosition {
  id: string;
  symbol: string;
  direction: PositionDirection;
  status: PositionStatus;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  pnlPercent: number;
  fees: number;
  openedAt: string;
  closedAt: string | null;
  strategy?: string;
}

export interface PaperAccountState {
  startingBalance: number;
  balance: number;
  equity: number;
  currency: string;
  realizedPnl: number;
  unrealizedPnl: number;
  todayPnl: number;
  openPositions: PaperPosition[];
  closedPositions: PaperPosition[];
  orders: PaperOrder[];
  updatedAt: string;
}

// ─── Strateji ────────────────────────────────────────────────────────────────

export type SignalAction = 'long' | 'short' | 'exit' | 'hold';

export interface StrategySignal {
  action: SignalAction;
  index: number;
  price: number;
  reason: string;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean_reversion' | 'breakout' | 'smc';
  params: Record<string, number>;
  evaluate: (candles: Candle[], params: Record<string, number>) => StrategySignal[];
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  type: StrategyDefinition['type'];
  params: Record<string, number>;
}

// ─── Backtest ────────────────────────────────────────────────────────────────

export interface BacktestTrade {
  direction: PositionDirection;
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

export interface BacktestResult {
  strategyId: string;
  symbol: string;
  timeframe: Timeframe;
  candleCount: number;
  startingBalance: number;
  endingBalance: number;
  totalReturnPercent: number;
  trades: BacktestTrade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdownPercent: number;
  profitFactor: number | null;
  sharpeLike: number | null;
  averageTradePercent: number;
  durationMs: number;
  generatedAt: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertCondition = 'price_above' | 'price_below' | 'rsi_above' | 'rsi_below';
export type AlertStatus = 'active' | 'triggered' | 'cancelled';

export interface QuantAlert {
  id: string;
  symbol: string;
  exchange: ExchangeName;
  timeframe: Timeframe;
  condition: AlertCondition;
  threshold: number;
  status: AlertStatus;
  message: string;
  createdAt: string;
  triggeredAt: string | null;
  triggeredValue: number | null;
}

// ─── Voice (APEX Voice altyapı) ─────────────────────────────────────────────

export type VoiceIntentName =
  | 'task.create'
  | 'task.query'
  | 'project.create'
  | 'project.status'
  | 'trading.status'
  | 'trading.analysis'
  | 'trading.closeAll'
  | 'trading.riskReport'
  | 'trading.pnl'
  | 'market.scan'
  | 'memory.recall'
  | 'screen.describe'
  | 'file.summarize'
  | 'error.explain'
  | 'file.analyze'
  | 'clipboard.read'
  | 'workflow.start'
  | 'report.generate'
  | 'executive.chat'
  | 'unknown';

export interface VoiceIntent {
  intent: VoiceIntentName;
  confidence: number; // 0-1
  params: Record<string, string>;
  rawText: string;
}

export interface VoiceResponse {
  intent: VoiceIntentName;
  speech: string;
  data: Record<string, unknown> | null;
  requiresApproval: boolean;
  handledAt: string;
}
