import type { TradeReview, TradeJournalEntry } from './types';
import { journalClose, getJournalEntry } from './trade-journal';

// AI Trade Review — işlem kapanınca Executive değerlendirmesi: neden açıldı,
// neden kapandı, hata neydi, bir dahaki öneri. Explainable kural motoru (mevcut
// Executive pattern), yeni AI yok. journalClose'a executiveReview yazar.

export function reviewTrade(entry: TradeJournalEntry): TradeReview {
  const isWin = entry.result === 'win';
  const isLoss = entry.result === 'loss';

  const whyOpened = `${entry.direction === 'long' ? 'Long' : 'Short'} açıldı: ${entry.reason}. AI gerekçesi: ${entry.aiRationale}. Giriş risk skoru ${entry.riskScore}.`;

  const pnlPct = entry.exitPrice
    ? ((entry.direction === 'long'
        ? entry.exitPrice - entry.entryPrice
        : entry.entryPrice - entry.exitPrice) /
        entry.entryPrice) *
      100
    : 0;

  const whyClosed = isWin
    ? `Kâr realize edildi (%${pnlPct.toFixed(2)}). Hedef/momentum tuttu.`
    : isLoss
      ? `Zararla kapandı (%${pnlPct.toFixed(2)}). Stop veya ters hareket.`
      : 'Başa baş kapandı.';

  let mistake: string | null = null;
  if (isLoss) {
    if (entry.riskScore > 60)
      mistake = 'Yüksek risk skorlu girişte pozisyon açıldı — daha seçici olunmalıydı.';
    else if (Math.abs(pnlPct) > 5) mistake = 'Stop-loss çok geniş — zarar büyüdü.';
    else mistake = 'Piyasa yönü yanlış okundu; teyit beklenebilirdi.';
  } else if (isWin && entry.riskScore > 55) {
    mistake = 'Kâr etti ama giriş riski yüksekti — şans faktörü var.';
  }

  const nextSuggestion = isLoss
    ? entry.riskScore > 60
      ? 'Risk skoru 50 altındaki setuplarda işlem aç.'
      : 'Stop mesafesini ATR bazlı daralt, R/R en az 1.5 hedefle.'
    : isWin
      ? 'Benzer setuplarda pozisyon boyutunu risk limitinde tut, kâr al kademelendir.'
      : 'Net momentum gelene kadar bekle.';

  const grade: TradeReview['grade'] =
    isWin && entry.riskScore <= 45
      ? 'A'
      : isWin
        ? 'B'
        : isLoss && entry.riskScore <= 45
          ? 'C'
          : 'D';

  return {
    journalId: entry.id,
    symbol: entry.symbol,
    whyOpened,
    whyClosed,
    mistake,
    nextSuggestion,
    grade,
    generatedAt: new Date().toISOString(),
  };
}

/** İşlemi kapat + Executive review üret + journal'a yaz (tek akış). */
export function closeWithReview(
  journalId: string,
  exitPrice: number,
): { entry: TradeJournalEntry; review: TradeReview } | null {
  const closed = journalClose(journalId, exitPrice);
  if (!closed) return null;
  const review = reviewTrade(closed);
  // Review özetini journal'a işle
  const updated = getJournalEntry(journalId);
  if (updated) updated.executiveReview = `${review.grade}: ${review.nextSuggestion}`;
  return { entry: closed, review };
}
