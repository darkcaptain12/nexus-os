import type { AIContext } from './types';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '@/lib/repositories';
import { analyzeRisks } from './risk-engine';
import { calculateProductivity } from './productivity';

export function buildAIContext(
  tasks: TaskRecord[],
  projects: { project: ProjectRecord; progress: ProjectProgress }[],
  taskSummary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueToday: number;
    highPriority: number;
  },
): AIContext {
  const recentTasks = tasks
    .filter((t) => t.deleted_at === null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
    }));

  const activeProjects = projects
    .filter((p) => p.project.status === 'active' || p.project.status === 'planning')
    .map((p) => ({
      id: p.project.id,
      name: p.project.name,
      status: p.project.status,
      progress: p.progress.percent,
    }));

  const risks = analyzeRisks(tasks, projects, taskSummary);
  const productivity = calculateProductivity(
    taskSummary,
    projects.map((p) => p.progress),
  );

  return {
    tasks: { recent: recentTasks },
    projects: { active: activeProjects },
    risks,
    productivityScore: productivity.score,
    generatedAt: new Date().toISOString(),
  };
}
