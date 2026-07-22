import type { ExplainableDecision, CycleLearning } from '../types';
import { getDecisionHistory } from '../decision-history';

export function recordCycleDecisions(cycleId: string, decisions: ExplainableDecision[]): void {
  const store = getDecisionHistory();
  for (const d of decisions) {
    store.add({
      decision: d.decision,
      category: d.category,
      confidence: d.confidence,
      outcome: 'pending',
      reasoning: `[Cycle:${cycleId}] ${d.reasoning}`,
    });
  }
}

export function generateCycleLearning(
  cycleId: string,
  decisions: ExplainableDecision[],
): CycleLearning {
  const store = getDecisionHistory();
  const report = store.getLearningReport();

  const trend: CycleLearning['acceptanceRateTrend'] =
    report.acceptanceRate >= 70
      ? 'improving'
      : report.acceptanceRate <= 30
        ? 'declining'
        : 'stable';

  const topInsight =
    decisions.length === 0
      ? `Döngü ${cycleId}: Karar üretilmedi — bağlam yetersiz veya tüm riskler düşük seviyede.`
      : decisions.some((d) => d.requiresApproval)
        ? `${decisions.filter((d) => d.requiresApproval).length} karar onay bekliyor — bu haftaki kabul oranı %${report.acceptanceRate}.`
        : `${decisions.length} otomatik karar üretildi — kullanıcı onayı gerektirmiyor.`;

  return {
    cycleId,
    decisionsAdded: decisions.length,
    acceptanceRateTrend: trend,
    topInsight,
    generatedAt: new Date().toISOString(),
  };
}
