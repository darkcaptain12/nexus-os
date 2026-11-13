import type { TradeJournalEntry } from './types';
import { getMemoryStore } from '@/lib/memory/store';
import { recordTrade } from '@/lib/knowledge/auto-linker';
import { emitHook } from '@/lib/plugins/event-hooks';
import { persistJournalEntry, loadJournalFromDb } from './trade-journal-repository';
import { deferPersist } from '@/lib/persist-after';

// Trade Journal — her işlem giriş/çıkış/sebep/AI gerekçe/risk/sonuç. Memory +
// Knowledge Graph'a bağlanır (mevcut recordTrade reuse). Ring buffer + Supabase
// write-through (Faz 2 kalıcılık): globalThis hızlı erişim, Supabase kalıcı kaynak.

const MAX_ENTRIES = 500;
const g = globalThis as unknown as { __apexTradeJournal?: TradeJournalEntry[] };

function store(): TradeJournalEntry[] {
  if (!g.__apexTradeJournal) g.__apexTradeJournal = [];
  return g.__apexTradeJournal;
}

export interface JournalOpenInput {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  reason: string;
  aiRationale: string;
  riskScore: number;
  exchange: string;
  strategy?: string;
  screenshotRef?: string;
}

export function journalOpen(input: JournalOpenInput): TradeJournalEntry {
  const entry: TradeJournalEntry = {
    id: crypto.randomUUID(),
    symbol: input.symbol,
    direction: input.direction,
    entryPrice: input.entryPrice,
    exitPrice: null,
    quantity: input.quantity,
    reason: input.reason,
    aiRationale: input.aiRationale,
    riskScore: input.riskScore,
    result: 'open',
    pnl: 0,
    strategy: input.strategy,
    screenshotRef: input.screenshotRef,
    openedAt: new Date().toISOString(),
    closedAt: null,
  };
  const s = store();
  s.push(entry);
  if (s.length > MAX_ENTRIES) s.shift();

  // Knowledge Graph: trade→strategy→decision→risk→portfolio→market (reuse)
  recordTrade({
    symbol: input.symbol,
    side: input.direction === 'long' ? 'buy' : 'sell',
    quantity: input.quantity,
    price: input.entryPrice,
    exchange: input.exchange,
    strategy: input.strategy,
  });

  emitHook('trade.opened', {
    symbol: input.symbol,
    direction: input.direction,
    entryPrice: input.entryPrice,
  });

  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `Live pozisyon açıldı: ${input.symbol} ${input.direction}`,
    description: `${input.reason} | AI: ${input.aiRationale} | risk ${input.riskScore}`,
    timestamp: entry.openedAt,
    metadata: { journalId: entry.id, symbol: input.symbol, riskScore: input.riskScore },
  });

  // Supabase write-through (kalıcılık) — hata journalOpen'ı bozmaz (globalThis fallback)
  deferPersist(() => persistJournalEntry(entry));
  return entry;
}

export function journalClose(
  id: string,
  exitPrice: number,
  executiveReview?: string,
): TradeJournalEntry | null {
  const entry = store().find((e) => e.id === id);
  if (!entry || entry.result !== 'open') return null;

  const gross =
    entry.direction === 'long'
      ? (exitPrice - entry.entryPrice) * entry.quantity
      : (entry.entryPrice - exitPrice) * entry.quantity;
  entry.exitPrice = exitPrice;
  entry.pnl = Number(gross.toFixed(2));
  entry.result = gross > 0 ? 'win' : gross < 0 ? 'loss' : 'breakeven';
  entry.closedAt = new Date().toISOString();
  if (executiveReview) entry.executiveReview = executiveReview;

  emitHook('trade.closed', { symbol: entry.symbol, result: entry.result, pnl: entry.pnl });

  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `Live pozisyon kapandı: ${entry.symbol} — ${entry.result}`,
    description: `PnL ${entry.pnl} | giriş ${entry.entryPrice} çıkış ${exitPrice}`,
    timestamp: entry.closedAt,
    metadata: { journalId: entry.id, result: entry.result, pnl: entry.pnl },
  });

  // Supabase write-through (kapanış güncellemesi kalıcı)
  deferPersist(() => persistJournalEntry(entry));
  return entry;
}

/**
 * Kalıcı journal — Supabase'den okur (cold-start sonrası veri korunur).
 * Supabase yoksa globalThis'e düşer (graceful). Server component'ler bunu kullanmalı.
 */
export async function getJournalPersistent(
  limit = 50,
  result?: TradeJournalEntry['result'],
): Promise<TradeJournalEntry[]> {
  const db = await loadJournalFromDb(500);
  const source = db ?? [...store()].reverse();
  const filtered = result ? source.filter((e) => e.result === result) : source;
  return filtered.slice(0, limit);
}

export function getJournal(limit = 50, result?: TradeJournalEntry['result']): TradeJournalEntry[] {
  let items = [...store()].reverse();
  if (result) items = items.filter((e) => e.result === result);
  return items.slice(0, limit);
}

export function getJournalEntry(id: string): TradeJournalEntry | null {
  return store().find((e) => e.id === id) ?? null;
}

export function getJournalStats(): {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
} {
  const s = store();
  const closed = s.filter((e) => e.result !== 'open');
  const wins = closed.filter((e) => e.result === 'win').length;
  const losses = closed.filter((e) => e.result === 'loss').length;
  return {
    total: s.length,
    wins,
    losses,
    winRate: closed.length > 0 ? Number(((wins / closed.length) * 100).toFixed(1)) : 0,
    totalPnl: Number(closed.reduce((sum, e) => sum + e.pnl, 0).toFixed(2)),
  };
}

export function getTodayTradeCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  return store().filter((e) => e.openedAt.startsWith(today)).length;
}
