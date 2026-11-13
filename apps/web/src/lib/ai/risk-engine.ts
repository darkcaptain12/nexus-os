import type { Risk, TaskSummary } from './types';
import type { TaskRecord } from '@/lib/repositories';
import type { ProjectRecord, ProjectProgress } from '@/lib/repositories';

export function analyzeRisks(
  tasks: TaskRecord[],
  projects: { project: ProjectRecord; progress: ProjectProgress }[],
  taskSummary: TaskSummary,
): Risk[] {
  const risks: Risk[] = [];

  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      t.status !== 'completed' &&
      t.status !== 'cancelled',
  );
  for (const task of overdueTasks.slice(0, 5)) {
    const daysOverdue = Math.ceil((Date.now() - new Date(task.due_date!).getTime()) / 86400000);
    risks.push({
      id: `deadline-${task.id}`,
      title: `"${task.title}" ${daysOverdue} gün gecikmiş`,
      description: `Son teslim tarihi ${new Date(task.due_date!).toLocaleDateString('tr-TR')} idi.`,
      level: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
      category: 'deadline',
      score: Math.min(100, 50 + daysOverdue * 7),
      reasoning: `Bu görev ${daysOverdue} gündür teslim tarihini geçmiş durumda.`,
      actionUrl: '/gorevler',
    });
  }

  const staleTasks = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    const daysSinceUpdate = Math.ceil((Date.now() - new Date(t.updated_at).getTime()) / 86400000);
    return daysSinceUpdate > 7;
  });
  for (const task of staleTasks.slice(0, 3)) {
    const days = Math.ceil((Date.now() - new Date(task.updated_at).getTime()) / 86400000);
    risks.push({
      id: `stale-${task.id}`,
      title: `"${task.title}" ${days} gündür güncellenmedi`,
      description: 'Bu görev uzun süredir işlem görmüyor.',
      level: days > 14 ? 'high' : 'medium',
      category: 'stale',
      score: Math.min(80, 30 + days * 3),
      reasoning: `Son güncelleme ${days} gün önce yapıldı.`,
      actionUrl: '/gorevler',
    });
  }

  if (taskSummary.pending + taskSummary.inProgress > 20) {
    risks.push({
      id: 'overload',
      title: 'Fazla açık görev uyarısı',
      description: `${taskSummary.pending + taskSummary.inProgress} açık görev bulunuyor.`,
      level: taskSummary.pending + taskSummary.inProgress > 30 ? 'high' : 'medium',
      category: 'overload',
      score: Math.min(90, 40 + (taskSummary.pending + taskSummary.inProgress) * 2),
      reasoning: 'Açık görev sayısı yüksek — önceliklendirme önerilir.',
    });
  }

  for (const { project, progress } of projects) {
    if (project.status !== 'active' && project.status !== 'planning') continue;

    if (progress.overdueTasks > 0 && progress.totalTasks > 0) {
      const overduePercent = Math.round((progress.overdueTasks / progress.totalTasks) * 100);
      if (overduePercent > 30) {
        risks.push({
          id: `project-risk-${project.id}`,
          title: `"${project.name}" risk altında`,
          description: `Görevlerin %${overduePercent}'i gecikmiş.`,
          level: overduePercent > 60 ? 'critical' : 'high',
          category: 'project',
          score: Math.min(95, 50 + overduePercent),
          reasoning: `Proje görevlerinin %${overduePercent}'i teslim tarihini geçmiş durumda.`,
          actionUrl: '/projeler',
        });
      }
    }

    if (project.end_date) {
      const daysLeft = Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000);
      if (daysLeft > 0 && daysLeft < 7 && progress.percent < 80) {
        risks.push({
          id: `project-deadline-${project.id}`,
          title: `"${project.name}" bitiş tarihine ${daysLeft} gün kaldı`,
          description: `İlerleme %${progress.percent} — tamamlanma riski var.`,
          level: daysLeft < 3 ? 'critical' : 'high',
          category: 'deadline',
          score: Math.min(95, 70 + (7 - daysLeft) * 5),
          reasoning: `Bitiş tarihine ${daysLeft} gün kala ilerleme %${progress.percent}.`,
          actionUrl: '/projeler',
        });
      }
    }
  }

  return risks.sort((a, b) => b.score - a.score);
}

export function calculateOverallRiskScore(risks: Risk[]): number {
  if (risks.length === 0) return 0;
  const totalScore = risks.reduce((sum, r) => sum + r.score, 0);
  return Math.min(100, Math.round(totalScore / risks.length));
}
