import type {
  Risk,
  Recommendation,
  TaskSummary,
  GoalSummary,
  ExplainableDecision,
  DecisionAlternative,
  RiskLevel,
} from './types';

const CONFIDENCE_BY_EVIDENCE_COUNT = (n: number): number =>
  n === 0 ? 40 : n === 1 ? 60 : n === 2 ? 75 : n >= 3 ? 88 : 50;

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function impactFromScore(score: number): ExplainableDecision['impact'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Converts a high-severity risk into an actionable explainable decision. */
function riskToDecision(risk: Risk): ExplainableDecision {
  const evidence: string[] = [risk.reasoning];

  const alternatives: DecisionAlternative[] = [
    { option: 'Hemen harekete geç', score: 90, tradeoff: 'Diğer görevler gecikmeyebilir' },
    { option: 'Takvimi yeniden planla', score: 70, tradeoff: 'Zaman kaybı riski' },
    { option: 'Devret veya yardım iste', score: 55, tradeoff: 'Koordinasyon maliyeti' },
    { option: 'Kabul et ve izle', score: 20, tradeoff: 'Risk büyüyebilir' },
  ];

  return {
    id: `decision-${risk.id}`,
    decision: `"${risk.title}" için acil aksiyon al`,
    reasoning: `Risk skoru ${risk.score}/100 — ${risk.level} seviyesinde. ${risk.description}`,
    confidence: CONFIDENCE_BY_EVIDENCE_COUNT(evidence.length),
    evidence,
    alternatives,
    tradeoffs: ['Önceliklendirme değişikliği gerektirir', 'Mevcut planı aksatabilir'],
    risk: risk.level,
    impact: impactFromScore(risk.score),
    estimatedBenefit: 'Risk azalır, deadline korunur',
    estimatedCost: '2-4 saat odak süresi',
    category: risk.category === 'project' ? 'project' : 'task',
    requiresApproval: risk.level === 'critical' || risk.level === 'high',
    createdAt: new Date().toISOString(),
  };
}

/** Converts a rule-engine recommendation into an explainable decision. */
function recommendationToDecision(rec: Recommendation): ExplainableDecision {
  const evidence: string[] = [rec.reasoning];
  if (rec.score >= 90) evidence.push('Yüksek skor — acil dikkat gerektirir');
  if (rec.priority <= 2) evidence.push('Yüksek öncelik sıralaması');

  const alternatives: DecisionAlternative[] = [
    { option: 'Bugün uygula', score: rec.score, tradeoff: 'Diğer işler gecikebilir' },
    { option: 'Bu hafta uygula', score: rec.score - 15, tradeoff: 'Daha az baskı ama risk artar' },
    { option: 'Ertele', score: Math.max(0, rec.score - 40), tradeoff: 'Sorun büyüyebilir' },
  ];

  return {
    id: `decision-rec-${rec.id}`,
    decision: rec.title,
    reasoning: rec.reasoning,
    confidence: CONFIDENCE_BY_EVIDENCE_COUNT(evidence.length),
    evidence,
    alternatives,
    tradeoffs:
      rec.priority <= 2 ? ['Diğer düşük öncelikli işler bekler'] : ['Görev sırası değişir'],
    risk: riskLevelFromScore(100 - rec.score),
    impact: impactFromScore(rec.score),
    estimatedBenefit: rec.description,
    estimatedCost: 'Tahmin: 1-2 saat',
    category: rec.category as ExplainableDecision['category'],
    requiresApproval: false,
    createdAt: new Date().toISOString(),
  };
}

/** Generates a productivity-focused decision when score is below threshold. */
function productivityDecision(
  taskSummary: TaskSummary,
  goalSummary: GoalSummary,
): ExplainableDecision | null {
  const pressure = taskSummary.overdue + taskSummary.highPriority;
  if (pressure < 5) return null;

  const evidence: string[] = [];
  if (taskSummary.overdue > 0) evidence.push(`${taskSummary.overdue} gecikmiş görev`);
  if (taskSummary.highPriority > 0)
    evidence.push(`${taskSummary.highPriority} yüksek öncelikli görev`);
  if (goalSummary.active > 0 && goalSummary.averageProgress < 30) {
    evidence.push(`Hedef ilerlemesi %${Math.round(goalSummary.averageProgress)}`);
  }

  const score = Math.min(100, pressure * 8);

  return {
    id: 'decision-productivity-pressure',
    decision: 'Odak moduna geç ve iş yükünü azalt',
    reasoning: `Toplam baskı göstergesi ${pressure} — verimlilik tehdit altında. Gecikmiş + yüksek öncelikli görev sayısı eşiği aşıyor.`,
    confidence: CONFIDENCE_BY_EVIDENCE_COUNT(evidence.length),
    evidence,
    alternatives: [
      {
        option: 'Görevleri filtrele ve sadece kritiklere odaklan',
        score: 85,
        tradeoff: 'Bazı işler tamamen rafa kalkar',
      },
      { option: 'Bazı görevleri devret veya sil', score: 75, tradeoff: 'Koordinasyon maliyeti' },
      { option: "Deadline'ları uzat", score: 50, tradeoff: 'Bağımlılıkları etkiler' },
    ],
    tradeoffs: ['Tüm görevleri aynı anda yapmak verimliliği düşürür'],
    risk: riskLevelFromScore(score),
    impact: 'high',
    estimatedBenefit: 'Tamamlanma oranı artar, stres azalır',
    estimatedCost: '30 dakika planlama',
    category: 'productivity',
    requiresApproval: false,
    createdAt: new Date().toISOString(),
  };
}

export interface DecisionEngineInput {
  risks: Risk[];
  recommendations: Recommendation[];
  taskSummary: TaskSummary;
  goalSummary: GoalSummary;
}

/**
 * Decision Engine — takes executive context, produces ExplainableDecision[].
 * Every decision includes reasoning, confidence, evidence, alternatives,
 * trade-offs, risk, impact, estimated benefit/cost, and approval flag.
 * AI never acts without user approval (requiresApproval=true decisions).
 */
export function runDecisionEngine(input: DecisionEngineInput): ExplainableDecision[] {
  const { risks, recommendations, taskSummary, goalSummary } = input;
  const decisions: ExplainableDecision[] = [];

  // High/Critical risks become decisions
  for (const risk of risks
    .filter((r) => r.level === 'critical' || r.level === 'high')
    .slice(0, 5)) {
    decisions.push(riskToDecision(risk));
  }

  // Top recommendations become decisions
  for (const rec of recommendations.filter((r) => r.score >= 70).slice(0, 4)) {
    decisions.push(recommendationToDecision(rec));
  }

  // Productivity pressure decision
  const prodDecision = productivityDecision(taskSummary, goalSummary);
  if (prodDecision) decisions.push(prodDecision);

  // Sort: approval-required first, then by confidence desc
  return decisions.sort((a, b) => {
    if (a.requiresApproval !== b.requiresApproval) return a.requiresApproval ? -1 : 1;
    return b.confidence - a.confidence;
  });
}
