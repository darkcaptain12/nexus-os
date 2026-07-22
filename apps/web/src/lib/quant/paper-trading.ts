import type {
  PaperOrder,
  PaperPosition,
  PaperAccountState,
  OrderSide,
  OrderType,
  PositionDirection,
  RiskProfile,
} from './types';
import { checkOrderRisk, DEFAULT_RISK_PROFILE } from './risk-engine';

// Paper Trading Engine — gerçek para YOK. Emir, fill, PnL tamamen simüle.
// Fill fiyatı çağrı anında verilen gerçek piyasa fiyatıdır (market-data'dan gelir).

const STARTING_BALANCE = 10_000;
const FEE_RATE = 0.001; // %0.1 taker

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  marketPrice: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  source?: PaperOrder['source'];
  strategy?: string;
}

export class PaperTradingEngine {
  private startingBalance = STARTING_BALANCE;
  private balance = STARTING_BALANCE;
  private openPositions: PaperPosition[] = [];
  private closedPositions: PaperPosition[] = [];
  private orders: PaperOrder[] = [];
  private dayKey = new Date().toISOString().slice(0, 10);
  private todayRealized = 0;
  private riskProfile: RiskProfile = { ...DEFAULT_RISK_PROFILE };

  private rollDayIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.dayKey) {
      this.dayKey = today;
      this.todayRealized = 0;
    }
  }

  getRiskProfile(): RiskProfile {
    return { ...this.riskProfile };
  }

  setRiskProfile(profile: Partial<RiskProfile>): RiskProfile {
    this.riskProfile = { ...this.riskProfile, ...profile };
    return this.getRiskProfile();
  }

  /**
   * Emir ver. Risk kontrolünden geçmeyen emir 'rejected' olur.
   * Market emri anında fill; limit emri fiyat uygunsa fill, değilse pending.
   */
  placeOrder(input: PlaceOrderInput): PaperOrder {
    this.rollDayIfNeeded();
    const now = new Date().toISOString();
    const order: PaperOrder = {
      id: crypto.randomUUID(),
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      price: input.type === 'limit' ? (input.limitPrice ?? null) : null,
      quantity: input.quantity,
      status: 'pending',
      filledPrice: null,
      fee: 0,
      createdAt: now,
      filledAt: null,
      source: input.source ?? 'manual',
    };

    const positionValue = input.quantity * input.marketPrice;
    const risk = checkOrderRisk(
      this.getState(input.marketPrice ? { [input.symbol]: input.marketPrice } : {}),
      { positionValue, stopLoss: input.stopLoss ?? null },
      this.riskProfile,
    );
    if (!risk.allowed) {
      order.status = 'rejected';
      order.error = risk.violations.join(' | ');
      this.orders.push(order);
      return order;
    }

    let fillPrice: number | null = null;
    if (input.type === 'market') {
      fillPrice = input.marketPrice;
    } else if (input.limitPrice !== undefined) {
      const crossable =
        input.side === 'buy'
          ? input.marketPrice <= input.limitPrice
          : input.marketPrice >= input.limitPrice;
      if (crossable) fillPrice = input.limitPrice;
    }

    if (fillPrice !== null) {
      this.fill(order, fillPrice, input);
    }

    this.orders.push(order);
    return order;
  }

  private fill(order: PaperOrder, price: number, input: PlaceOrderInput): void {
    const fee = order.quantity * price * FEE_RATE;
    order.status = 'filled';
    order.filledPrice = price;
    order.fee = Number(fee.toFixed(8));
    order.filledAt = new Date().toISOString();

    this.balance -= fee;

    const direction: PositionDirection = order.side === 'buy' ? 'long' : 'short';
    const opposite = this.openPositions.find(
      (p) => p.symbol === order.symbol && p.direction !== direction,
    );

    if (opposite) {
      this.closePositionAt(opposite.id, price, 'Ters yön emri ile kapatıldı');
      return;
    }

    this.openPositions.push({
      id: crypto.randomUUID(),
      symbol: order.symbol,
      direction,
      status: 'open',
      entryPrice: price,
      exitPrice: null,
      quantity: order.quantity,
      stopLoss: input.stopLoss ?? null,
      takeProfit: input.takeProfit ?? null,
      pnl: 0,
      pnlPercent: 0,
      fees: order.fee,
      openedAt: order.filledAt!,
      closedAt: null,
      strategy: input.strategy,
    });
  }

  closePositionAt(positionId: string, price: number, reason: string): PaperPosition | null {
    this.rollDayIfNeeded();
    const idx = this.openPositions.findIndex((p) => p.id === positionId);
    if (idx === -1) return null;
    const pos = this.openPositions[idx]!;

    const gross =
      pos.direction === 'long'
        ? (price - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - price) * pos.quantity;
    const closeFee = pos.quantity * price * FEE_RATE;
    const net = gross - closeFee;

    pos.status = 'closed';
    pos.exitPrice = price;
    pos.pnl = Number(net.toFixed(8));
    pos.pnlPercent = Number(((net / (pos.entryPrice * pos.quantity)) * 100).toFixed(4));
    pos.fees = Number((pos.fees + closeFee).toFixed(8));
    pos.closedAt = new Date().toISOString();

    this.balance += net;
    this.todayRealized += net;

    this.openPositions.splice(idx, 1);
    this.closedPositions.push(pos);

    void reason;
    return pos;
  }

  /** Fiyat güncellemesiyle stop-loss / take-profit tetikle. */
  updatePrices(prices: Record<string, number>): PaperPosition[] {
    const closed: PaperPosition[] = [];
    for (const pos of [...this.openPositions]) {
      const price = prices[pos.symbol];
      if (price === undefined) continue;

      const hitStop =
        pos.stopLoss !== null &&
        (pos.direction === 'long' ? price <= pos.stopLoss : price >= pos.stopLoss);
      const hitTp =
        pos.takeProfit !== null &&
        (pos.direction === 'long' ? price >= pos.takeProfit : price <= pos.takeProfit);

      if (hitStop) {
        const c = this.closePositionAt(pos.id, pos.stopLoss!, 'Stop-loss tetiklendi');
        if (c) closed.push(c);
      } else if (hitTp) {
        const c = this.closePositionAt(pos.id, pos.takeProfit!, 'Take-profit tetiklendi');
        if (c) closed.push(c);
      }
    }
    return closed;
  }

  getState(prices: Record<string, number> = {}): PaperAccountState {
    this.rollDayIfNeeded();
    let unrealized = 0;
    for (const pos of this.openPositions) {
      const price = prices[pos.symbol];
      if (price === undefined) continue;
      unrealized +=
        pos.direction === 'long'
          ? (price - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - price) * pos.quantity;
    }

    return {
      startingBalance: this.startingBalance,
      balance: Number(this.balance.toFixed(2)),
      equity: Number((this.balance + unrealized).toFixed(2)),
      currency: 'USDT',
      realizedPnl: Number((this.balance - this.startingBalance).toFixed(2)),
      unrealizedPnl: Number(unrealized.toFixed(2)),
      todayPnl: Number(this.todayRealized.toFixed(2)),
      openPositions: [...this.openPositions],
      closedPositions: [...this.closedPositions].slice(-50),
      orders: [...this.orders].slice(-50).reverse(),
      updatedAt: new Date().toISOString(),
    };
  }

  reset(startingBalance = STARTING_BALANCE): void {
    this.startingBalance = startingBalance;
    this.balance = startingBalance;
    this.openPositions = [];
    this.closedPositions = [];
    this.orders = [];
    this.todayRealized = 0;
    this.riskProfile = { ...DEFAULT_RISK_PROFILE };
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexPaperTrading?: PaperTradingEngine };

export function getPaperTradingEngine(): PaperTradingEngine {
  if (!g.__apexPaperTrading) g.__apexPaperTrading = new PaperTradingEngine();
  return g.__apexPaperTrading;
}
