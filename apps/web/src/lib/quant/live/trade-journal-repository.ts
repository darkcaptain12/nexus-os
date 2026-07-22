import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TradeJournalEntry } from './types';

// Trade Journal Supabase persistence (Faz 2). Service-role client ile write-through
// (RLS bypass — action handler context'inde user oturumu yok). Tek kullanıcı
// sistemi; user_id null bırakılır. Supabase yoksa null döner (graceful).

let cached: SupabaseClient | null | undefined;

function serviceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

function toRow(e: TradeJournalEntry): Record<string, unknown> {
  return {
    id: e.id,
    symbol: e.symbol,
    direction: e.direction,
    entry_price: e.entryPrice,
    exit_price: e.exitPrice,
    quantity: e.quantity,
    reason: e.reason,
    ai_rationale: e.aiRationale,
    risk_score: e.riskScore,
    result: e.result,
    pnl: e.pnl,
    strategy: e.strategy ?? null,
    screenshot_ref: e.screenshotRef ?? null,
    executive_review: e.executiveReview ?? null,
    opened_at: e.openedAt,
    closed_at: e.closedAt,
  };
}

function fromRow(r: Record<string, unknown>): TradeJournalEntry {
  return {
    id: String(r['id']),
    symbol: String(r['symbol']),
    direction: r['direction'] as 'long' | 'short',
    entryPrice: Number(r['entry_price']),
    exitPrice: r['exit_price'] === null ? null : Number(r['exit_price']),
    quantity: Number(r['quantity']),
    reason: String(r['reason'] ?? ''),
    aiRationale: String(r['ai_rationale'] ?? ''),
    riskScore: Number(r['risk_score'] ?? 0),
    result: r['result'] as TradeJournalEntry['result'],
    pnl: Number(r['pnl'] ?? 0),
    strategy: (r['strategy'] as string) ?? undefined,
    screenshotRef: (r['screenshot_ref'] as string) ?? undefined,
    executiveReview: (r['executive_review'] as string) ?? undefined,
    openedAt: String(r['opened_at']),
    closedAt: r['closed_at'] === null ? null : String(r['closed_at']),
  };
}

/** Journal kaydını Supabase'e yaz (write-through). Hata sessizce yutulur (globalThis fallback). */
export async function persistJournalEntry(entry: TradeJournalEntry): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('trade_journal').upsert(toRow(entry), { onConflict: 'id' });
  return !error;
}

/** Journal'ı Supabase'den oku (kalıcı kaynak). Supabase yoksa null. */
export async function loadJournalFromDb(limit = 500): Promise<TradeJournalEntry[] | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data, error } = await db
    .from('trade_journal')
    .select('*')
    .is('deleted_at', null)
    .order('opened_at', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return data.map((r) => fromRow(r as Record<string, unknown>));
}
