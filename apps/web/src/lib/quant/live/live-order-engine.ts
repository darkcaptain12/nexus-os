import type { LiveOrder, LiveOrderInput } from './types';
import { getTicker } from '../market-data';
import { getPaperTradingEngine } from '../paper-trading';
import { checkLiveOrderRisk, getRiskProfileV2, type RiskV2Context } from './risk-engine-v2';
import { getTodayTradeCount } from './trade-journal';

// Live Order Engine — gerçek emir yaşam döngüsü:
// 1. Risk Engine v2 kontrolü → ihlalde REDDET (borsaya asla gitmez)
// 2. Geçerse Action Engine'e submit (critical risk, source:'ai') → Approval Queue
// 3. Onaydan sonra handler emri yürütür (paper engine tracking; canlı borsa
//    gönderimi API-key + onay gerektirir).
//
// KURAL: Gerçek para kullanan HER emir Approval Queue'dan geçer. Onaysız gönderilemez.

const MAX_ORDERS = 200;
const g = globalThis as unknown as { __apexLiveOrders?: LiveOrder[] };

function store(): LiveOrder[] {
  if (!g.__apexLiveOrders) g.__apexLiveOrders = [];
  return g.__apexLiveOrders;
}

function saveOrder(order: LiveOrder): void {
  const s = store();
  s.push(order);
  if (s.length > MAX_ORDERS) s.shift();
}

export interface SubmitLiveOrderResult {
  order: LiveOrder;
  requiresApproval: boolean;
  rejected: boolean;
}

/**
 * Canlı emir gönder. Önce Risk v2, geçerse Action Engine → Approval Queue.
 * Risk ihlali → order.status='rejected' (borsaya gitmez).
 */
export async function submitLiveOrder(input: LiveOrderInput): Promise<SubmitLiveOrderResult> {
  const now = new Date().toISOString();
  const order: LiveOrder = {
    id: crypto.randomUUID(),
    input,
    status: 'pending-approval',
    filledPrice: null,
    createdAt: now,
    updatedAt: now,
  };

  // Fiyat + risk bağlamı
  const ticker = await getTicker(input.exchange, input.symbol).catch(() => null);
  const marketPrice = input.price ?? ticker?.lastPrice ?? 0;
  const positionValue = input.quantity * marketPrice;

  const engine = getPaperTradingEngine();
  const account = engine.getState({ [input.symbol]: marketPrice });
  const symbolExposure = account.openPositions
    .filter((p) => p.symbol === input.symbol)
    .reduce((s, p) => s + p.entryPrice * p.quantity, 0);

  const ctx: RiskV2Context = {
    account,
    positionValue,
    todayTradeCount: getTodayTradeCount(),
    symbolExposureValue: symbolExposure,
  };

  const risk = checkLiveOrderRisk(input, ctx, getRiskProfileV2());
  if (!risk.allowed) {
    order.status = 'rejected';
    order.rejectionReason = risk.violations.join(' | ');
    order.updatedAt = new Date().toISOString();
    saveOrder(order);
    return { order, requiresApproval: false, rejected: true };
  }

  // Risk geçti → Action Engine → Approval Queue (critical risk otomatik onaya düşer)
  const { getActionEngine } = await import('@/lib/actions/engine-instance');
  const execution = await getActionEngine().submit({
    actionId: 'trade.liveOrder',
    params: {
      orderId: order.id,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      exchange: input.exchange,
      marketPrice,
    },
    requestedBy: 'live-order-engine',
    source: 'ai',
    priority: 1,
  });

  order.approvalExecutionId = execution.id;
  order.status = execution.status === 'pending-approval' ? 'pending-approval' : 'approved';
  order.updatedAt = new Date().toISOString();
  saveOrder(order);

  return { order, requiresApproval: execution.status === 'pending-approval', rejected: false };
}

export function getLiveOrders(limit = 50): LiveOrder[] {
  return store().slice(-limit).reverse();
}

export function getLiveOrder(id: string): LiveOrder | null {
  return store().find((o) => o.id === id) ?? null;
}

export function markOrderFilled(
  id: string,
  exchangeOrderId: string,
  filledPrice: number,
): LiveOrder | null {
  const order = store().find((o) => o.id === id);
  if (!order) return null;
  order.status = 'filled';
  order.exchangeOrderId = exchangeOrderId;
  order.filledPrice = filledPrice;
  order.updatedAt = new Date().toISOString();
  return order;
}
