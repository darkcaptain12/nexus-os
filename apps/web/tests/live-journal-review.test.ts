import { describe, it, expect } from 'vitest';
import {
  journalOpen,
  journalClose,
  getJournalStats,
  getTodayTradeCount,
} from '../src/lib/quant/live/trade-journal';
import { reviewTrade, closeWithReview } from '../src/lib/quant/live/ai-trade-review';

function open(o: Partial<Parameters<typeof journalOpen>[0]> = {}) {
  return journalOpen({
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 60000,
    quantity: 0.01,
    reason: 'SMC CHoCH bullish',
    aiRationale: 'RSI teyit',
    riskScore: 40,
    exchange: 'okx',
    ...o,
  });
}

describe('Trade Journal', () => {
  it('journalOpen kayıt açar + Memory/KG bağlar', () => {
    const e = open();
    expect(e.result).toBe('open');
    expect(e.symbol).toBe('BTCUSDT');
    expect(e.exitPrice).toBeNull();
  });

  it('journalClose win/loss hesaplar', () => {
    const e = open({ symbol: 'ETHUSDT', entryPrice: 3000, quantity: 0.1 });
    const closed = journalClose(e.id, 3200);
    expect(closed!.result).toBe('win');
    expect(closed!.pnl).toBeCloseTo(20, 0); // (3200-3000)*0.1
  });

  it('short pozisyon PnL doğru', () => {
    const e = open({ symbol: 'SOLUSDT', direction: 'short', entryPrice: 100, quantity: 1 });
    const closed = journalClose(e.id, 90);
    expect(closed!.result).toBe('win');
    expect(closed!.pnl).toBeCloseTo(10, 0); // (100-90)*1
  });

  it('getJournalStats win rate hesaplar', () => {
    const stats = getJournalStats();
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeLessThanOrEqual(100);
  });

  it('getTodayTradeCount bugünkü işlemleri sayar', () => {
    open();
    expect(getTodayTradeCount()).toBeGreaterThan(0);
  });

  it('kapalı kayıt tekrar kapatılamaz', () => {
    const e = open();
    journalClose(e.id, 61000);
    expect(journalClose(e.id, 62000)).toBeNull();
  });
});

describe('AI Trade Review — Executive değerlendirme', () => {
  it('kazançlı düşük risk → grade A', () => {
    const e = open({ riskScore: 30 });
    const closed = journalClose(e.id, 66000)!;
    const review = reviewTrade(closed);
    expect(review.grade).toBe('A');
    expect(review.whyOpened).toContain('Long');
    expect(review.whyClosed).toContain('Kâr');
  });

  it('zararlı yüksek risk → hata + öneri', () => {
    const e = open({ riskScore: 70 });
    const closed = journalClose(e.id, 54000)!;
    const review = reviewTrade(closed);
    expect(review.mistake).not.toBeNull();
    expect(review.nextSuggestion.length).toBeGreaterThan(0);
    expect(['C', 'D']).toContain(review.grade);
  });

  it('closeWithReview kapatır + review üretir', () => {
    const e = open({ symbol: 'XRPUSDT', entryPrice: 0.5, quantity: 100 });
    const result = closeWithReview(e.id, 0.55);
    expect(result).not.toBeNull();
    expect(result!.entry.result).toBe('win');
    expect(result!.review.grade).toBeTruthy();
    expect(result!.entry.executiveReview).toContain(result!.review.grade);
  });

  it('review 4 soruyu yanıtlar', () => {
    const e = open();
    const closed = journalClose(e.id, 61000)!;
    const review = reviewTrade(closed);
    expect(review.whyOpened).toBeTruthy();
    expect(review.whyClosed).toBeTruthy();
    expect(review.nextSuggestion).toBeTruthy();
  });
});
