import type { DecisionHistoryEntry, ExecutiveLearningReport } from './types';

const MAX_HISTORY = 500;

class DecisionHistoryStore {
  private entries: DecisionHistoryEntry[] = [];

  add(entry: Omit<DecisionHistoryEntry, 'id' | 'createdAt'>): DecisionHistoryEntry {
    const full: DecisionHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(full);
    if (this.entries.length > MAX_HISTORY) {
      this.entries.splice(0, this.entries.length - MAX_HISTORY);
    }
    return full;
  }

  recordOutcome(id: string, result: DecisionHistoryEntry['actualResult']): boolean {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return false;
    entry.actualResult = result;
    entry.resolvedAt = new Date().toISOString();
    return true;
  }

  resolveOutcome(id: string, outcome: 'accepted' | 'rejected'): boolean {
    const entry = this.entries.find((e) => e.id === id && e.outcome === 'pending');
    if (!entry) return false;
    entry.outcome = outcome;
    entry.resolvedAt = new Date().toISOString();
    return true;
  }

  getHistory(limit = 50): DecisionHistoryEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getLearningReport(): ExecutiveLearningReport {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const thisWeek = this.entries.filter((e) => new Date(e.createdAt) >= weekStart);

    const accepted = thisWeek.filter((e) => e.outcome === 'accepted').length;
    const rejected = thisWeek.filter((e) => e.outcome === 'rejected').length;
    const expired = thisWeek.filter((e) => e.outcome === 'expired').length;
    const total = thisWeek.length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    const successful = thisWeek.filter((e) => e.actualResult === 'successful').length;
    const resolved = thisWeek.filter(
      (e) => e.actualResult !== undefined && e.actualResult !== 'unknown',
    ).length;
    const successfulOutcomes = resolved > 0 ? Math.round((successful / resolved) * 100) : 0;

    const highConfidence = thisWeek.filter((e) => e.confidence >= 75);
    const highConfidenceSuccessful = highConfidence.filter(
      (e) => e.actualResult === 'successful',
    ).length;
    const confidenceAccuracy =
      highConfidence.length > 0
        ? Math.round((highConfidenceSuccessful / highConfidence.length) * 100)
        : 0;

    const categoryMap = new Map<string, { count: number; accepted: number }>();
    for (const e of thisWeek) {
      const existing = categoryMap.get(e.category) ?? { count: 0, accepted: 0 };
      categoryMap.set(e.category, {
        count: existing.count + 1,
        accepted: existing.accepted + (e.outcome === 'accepted' ? 1 : 0),
      });
    }
    const topCategories = [...categoryMap.entries()]
      .map(([category, data]) => ({
        category,
        count: data.count,
        acceptanceRate: data.count > 0 ? Math.round((data.accepted / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const insight =
      total === 0
        ? 'Bu hafta henüz karar verisi yok.'
        : accepted > rejected
          ? `Önerilerinizin %${acceptanceRate}'i kabul edildi — karar kalitesi yüksek.`
          : rejected > accepted
            ? `Önerilerinizin %${Math.round((rejected / total) * 100)}'i reddedildi — öneri stratejisi gözden geçirilmeli.`
            : 'Kararlar dengeli şekilde dağılmış.';

    return {
      weekStart: weekStart.toISOString().split('T')[0]!,
      weekEnd: weekEnd.toISOString().split('T')[0]!,
      totalDecisions: total,
      accepted,
      rejected,
      expired,
      acceptanceRate,
      successfulOutcomes,
      confidenceAccuracy,
      topCategories,
      insight,
      generatedAt: new Date().toISOString(),
    };
  }
}

let _instance: DecisionHistoryStore | null = null;

export function getDecisionHistory(): DecisionHistoryStore {
  if (!_instance) _instance = new DecisionHistoryStore();
  return _instance;
}
