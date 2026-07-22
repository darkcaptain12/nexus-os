import type { GoalRecord, PrioritizedGoal } from './types';

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  background: 10,
};

function deadlinePressureScore(targetDate: string | null): number {
  if (!targetDate) return 30;
  const daysLeft = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return 100;
  if (daysLeft <= 3) return 95;
  if (daysLeft <= 7) return 80;
  if (daysLeft <= 14) return 60;
  if (daysLeft <= 30) return 40;
  return 20;
}

function progressRiskScore(progress: number, targetDate: string | null): number {
  if (!targetDate) return 0;
  const daysLeft = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return 100;
  const expectedProgress = Math.max(0, 100 - (daysLeft / 30) * 100);
  const gap = Math.max(0, expectedProgress - progress);
  return Math.min(100, Math.round(gap * 1.5));
}

function actionRecommendation(goal: GoalRecord): string {
  if (!goal.target_date) {
    if (goal.progress < 20) return 'Başlangıç adımlarını belirle ve bir deadline koy';
    if (goal.progress < 60) return 'Haftalık ilerleme hedefi belirle';
    return 'Son %' + (100 - goal.progress) + ' için sprint planla';
  }
  const daysLeft = Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return 'Deadline geçti — yeniden planla veya kapat';
  if (daysLeft <= 7 && goal.progress < 80)
    return 'Kritik eşik — tüm kaynakları bu hedefe yönlendir';
  if (goal.progress >= 90) return 'Son adımları tamamla';
  return `${daysLeft} günde %${100 - goal.progress} tamamlanması gerekiyor`;
}

/**
 * Scores each active goal on multiple criteria and returns a Priority Queue.
 * Criteria weights: deadline(30) + importance(25) + progress risk(20) +
 * workload balance(15) + recency(10) = 100
 */
export function prioritizeGoals(goals: GoalRecord[]): PrioritizedGoal[] {
  const now = Date.now();

  return goals
    .filter((g) => g.status === 'active' || g.status === 'planning')
    .map((goal) => {
      const deadlineScore = deadlinePressureScore(goal.target_date);
      const importanceScore = PRIORITY_WEIGHT[goal.priority] ?? 50;
      const progressRisk = progressRiskScore(goal.progress, goal.target_date);
      const workloadScore = goal.progress < 30 ? 70 : goal.progress < 70 ? 50 : 30;
      const daysSinceUpdate = Math.ceil((now - new Date(goal.updated_at).getTime()) / 86400000);
      const recencyScore = daysSinceUpdate > 14 ? 80 : daysSinceUpdate > 7 ? 50 : 20;

      const breakdown = [
        {
          factor: 'Deadline baskısı',
          weight: 30,
          value: deadlineScore,
          contribution: Math.round(deadlineScore * 0.3),
        },
        {
          factor: 'Önem',
          weight: 25,
          value: importanceScore,
          contribution: Math.round(importanceScore * 0.25),
        },
        {
          factor: 'İlerleme riski',
          weight: 20,
          value: progressRisk,
          contribution: Math.round(progressRisk * 0.2),
        },
        {
          factor: 'İş yükü',
          weight: 15,
          value: workloadScore,
          contribution: Math.round(workloadScore * 0.15),
        },
        {
          factor: 'Güncellik',
          weight: 10,
          value: recencyScore,
          contribution: Math.round(recencyScore * 0.1),
        },
      ];

      const priorityScore = Math.min(
        100,
        breakdown.reduce((s, b) => s + b.contribution, 0),
      );

      return {
        goalId: goal.id,
        title: goal.title,
        priorityScore,
        scoreBreakdown: breakdown,
        deadlinePressure: deadlineScore,
        importance: importanceScore,
        workloadScore,
        riskScore: progressRisk,
        actionRecommendation: actionRecommendation(goal),
        targetDate: goal.target_date,
        progress: goal.progress,
      } satisfies PrioritizedGoal;
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
