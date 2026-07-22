import type { ProductivityScore, TaskSummary } from './types';
import type { ProjectProgress } from '@/lib/repositories';

export function calculateProductivity(
  taskSummary: TaskSummary,
  projectProgresses: ProjectProgress[],
  previousScore?: number,
): ProductivityScore {
  const breakdown: ProductivityScore['breakdown'] = [];

  const completionRate = taskSummary.total > 0 ? taskSummary.completed / taskSummary.total : 0;
  breakdown.push({
    factor: 'Görev tamamlama oranı',
    weight: 30,
    value: Math.round(completionRate * 100),
    contribution: Math.round(completionRate * 30),
  });

  const overdueRate = taskSummary.total > 0 ? 1 - taskSummary.overdue / taskSummary.total : 1;
  breakdown.push({
    factor: 'Zamanında teslim',
    weight: 25,
    value: Math.round(overdueRate * 100),
    contribution: Math.round(overdueRate * 25),
  });

  const avgProjectProgress =
    projectProgresses.length > 0
      ? projectProgresses.reduce((s, p) => s + p.percent, 0) / projectProgresses.length / 100
      : 0.5;
  breakdown.push({
    factor: 'Proje ilerlemesi',
    weight: 20,
    value: Math.round(avgProjectProgress * 100),
    contribution: Math.round(avgProjectProgress * 20),
  });

  const activeRatio =
    taskSummary.total > 0 ? taskSummary.inProgress / Math.max(taskSummary.total, 1) : 0;
  const activeScore = Math.min(activeRatio * 5, 1);
  breakdown.push({
    factor: 'Aktif çalışma',
    weight: 15,
    value: Math.round(activeScore * 100),
    contribution: Math.round(activeScore * 15),
  });

  const balanceScore =
    taskSummary.highPriority <= 5 ? 1 : Math.max(0, 1 - (taskSummary.highPriority - 5) * 0.1);
  breakdown.push({
    factor: 'İş yükü dengesi',
    weight: 10,
    value: Math.round(balanceScore * 100),
    contribution: Math.round(balanceScore * 10),
  });

  const score = Math.min(
    100,
    Math.max(
      0,
      breakdown.reduce((s, b) => s + b.contribution, 0),
    ),
  );

  let trend: ProductivityScore['trend'] = 'stable';
  if (previousScore !== undefined) {
    if (score > previousScore + 5) trend = 'improving';
    else if (score < previousScore - 5) trend = 'declining';
  }

  return { score, breakdown, trend, generatedAt: new Date().toISOString() };
}
