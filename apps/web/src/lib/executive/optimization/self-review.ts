import type { ExecutiveSelfReview, ReviewedDecision, ReviewVerdict, FailureItem } from './types';
import { getDecisionHistory } from '@/lib/ai/decision-history';
import { getJournal } from '@/lib/quant/live/trade-journal';
import { getRecentAdMetrics } from '@/lib/commerce/intelligence/ad-optimizer';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

// Executive Self Review — her gün Executive kendi kararlarını analiz eder.
// Mevcut decision-history (ai) + trade journal + ad metrics + agent store +
// workflow runtime REUSE eder. Yeni veri toplama YOK — mevcut kayıtları okur.

const g = globalThis as unknown as { __apexSelfReviews?: ExecutiveSelfReview[] };
const MAX_REVIEWS = 90; // ~3 ay günlük review

function store(): ExecutiveSelfReview[] {
  if (!g.__apexSelfReviews) g.__apexSelfReviews = [];
  return g.__apexSelfReviews;
}

function verdictOf(outcome: string, actualResult?: string): ReviewVerdict {
  if (outcome === 'rejected') return 'cancelled';
  if (outcome === 'pending') return 'pending';
  // accepted/expired → sonuca bak
  if (actualResult === 'successful') return 'correct';
  if (actualResult === 'failed') return 'wrong';
  return 'pending'; // henüz sonuçlanmadı
}

/** Executive kararlarını incele: doğru/yanlış/iptal + başarısız trade/ad/workflow/agent. */
export function runSelfReview(): ExecutiveSelfReview {
  const decisions = getDecisionHistory().getHistory(200);
  const reviewed: ReviewedDecision[] = decisions.map((d) => ({
    id: d.id,
    decision: d.decision,
    category: d.category,
    confidence: d.confidence,
    verdict: verdictOf(d.outcome, d.actualResult),
    reasoning: d.reasoning,
    at: d.createdAt,
  }));

  const correct = reviewed.filter((r) => r.verdict === 'correct').length;
  const wrong = reviewed.filter((r) => r.verdict === 'wrong').length;
  const cancelled = reviewed.filter((r) => r.verdict === 'cancelled').length;
  const pending = reviewed.filter((r) => r.verdict === 'pending').length;
  const resolved = correct + wrong;
  const accuracy = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

  const failures: FailureItem[] = [];

  // Başarısız trade'ler (journal loss)
  for (const t of getJournal(50, 'loss')) {
    failures.push({
      domain: 'trade',
      ref: t.id,
      title: `${t.symbol} ${t.direction} — zarar ${t.pnl}`,
      detail: `Giriş ${t.entryPrice} çıkış ${t.exitPrice ?? '?'} | risk skoru ${t.riskScore}${t.strategy ? ` | strateji ${t.strategy}` : ''}`,
      at: t.closedAt ?? t.openedAt,
    });
  }

  // Başarısız reklamlar (ROAS < 1)
  for (const ad of getRecentAdMetrics(50)) {
    if (ad.spend > 0 && ad.roas < 1) {
      failures.push({
        domain: 'ad',
        ref: ad.campaignId,
        title: `Reklam zararı — ROAS ${ad.roas}`,
        detail: `Harcama ${ad.spend} gelir ${ad.revenue} | ${ad.platform}`,
        at: ad.capturedAt,
      });
    }
  }

  // Başarısız workflow'lar
  for (const exec of getWorkflowRuntime().getHistory(undefined, 50)) {
    if (exec.phase === 'failed') {
      failures.push({
        domain: 'workflow',
        ref: exec.id,
        title: `Workflow başarısız: ${exec.workflowId}`,
        detail: exec.error ?? 'Hata detayı yok',
        at: exec.startedAt,
      });
    }
  }

  // Başarısız agent'lar
  for (const agent of getAgentStore().getAll(100)) {
    if (agent.state === 'FAILED') {
      failures.push({
        domain: 'agent',
        ref: agent.id,
        title: `Agent başarısız: ${agent.name}`,
        detail: agent.errorMessage ?? 'Hata detayı yok',
        at: agent.failedAt ?? agent.updatedAt,
      });
    }
  }

  const summary =
    resolved === 0
      ? 'Henüz sonuçlanmış karar yok — review için yeterli veri birikmedi.'
      : accuracy >= 70
        ? `Karar isabeti %${accuracy} — güçlü. ${failures.length} başarısızlık öğrenme motoruna aktarıldı.`
        : accuracy >= 40
          ? `Karar isabeti %${accuracy} — orta. ${wrong} yanlış karar analiz edilmeli.`
          : `Karar isabeti %${accuracy} — düşük. Öneri stratejisi gözden geçirilmeli (${failures.length} başarısızlık).`;

  const review: ExecutiveSelfReview = {
    date: new Date().toISOString().slice(0, 10),
    totalDecisions: reviewed.length,
    correct,
    wrong,
    cancelled,
    pending,
    accuracy,
    failures: failures.slice(0, 30),
    summary,
    generatedAt: new Date().toISOString(),
  };

  const s = store();
  s.push(review);
  if (s.length > MAX_REVIEWS) s.shift();
  return review;
}

export function getLatestSelfReview(): ExecutiveSelfReview | null {
  const s = store();
  return s[s.length - 1] ?? null;
}

export function getSelfReviewHistory(limit = 30): ExecutiveSelfReview[] {
  return [...store()].reverse().slice(0, limit);
}
