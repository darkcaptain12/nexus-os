import { describe, it, expect } from 'vitest';
import {
  journalOpen,
  journalClose,
  getJournal,
  getJournalPersistent,
} from '../src/lib/quant/live/trade-journal';

// Faz 2 — Trade Journal Supabase write-through. Test ortamında Supabase env yok
// → persist sessizce başarısız, okuma globalThis'e düşer (graceful). Sync API korunur.

describe('Trade Journal — Supabase write-through (graceful)', () => {
  it('journalOpen sync API korunur (globalThis) + write-through bozmaz', () => {
    const entry = journalOpen({
      symbol: 'ETHUSDT',
      direction: 'long',
      entryPrice: 3000,
      quantity: 0.1,
      reason: 'persistence test',
      aiRationale: 'x',
      riskScore: 30,
      exchange: 'okx',
      strategy: 'persist-strat',
    });
    expect(entry.id).toBeTruthy();
    expect(entry.result).toBe('open');
    // Sync okuma globalThis'ten çalışır
    expect(getJournal(50).some((e) => e.id === entry.id)).toBe(true);
  });

  it('journalClose write-through + PnL hesabı korunur', () => {
    const entry = journalOpen({
      symbol: 'BTCUSDT',
      direction: 'long',
      entryPrice: 60000,
      quantity: 0.01,
      reason: 't',
      aiRationale: 'x',
      riskScore: 20,
      exchange: 'okx',
    });
    const closed = journalClose(entry.id, 62000);
    expect(closed!.result).toBe('win');
    expect(closed!.pnl).toBe(20);
  });

  it('getJournalPersistent — Supabase yoksa globalThis fallback (graceful)', async () => {
    journalOpen({
      symbol: 'SOLUSDT',
      direction: 'short',
      entryPrice: 150,
      quantity: 1,
      reason: 't',
      aiRationale: 'x',
      riskScore: 25,
      exchange: 'okx',
    });
    const persistent = await getJournalPersistent(50);
    expect(Array.isArray(persistent)).toBe(true);
    expect(persistent.some((e) => e.symbol === 'SOLUSDT')).toBe(true); // fallback çalışıyor
  });
});
