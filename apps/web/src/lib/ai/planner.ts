import type { DailyPlan, PlanSlot, WeeklyReview, TaskSummary } from './types';
import type { TaskRecord } from '@/lib/repositories';

export function generateDailyPlan(tasks: TaskRecord[]): DailyPlan {
  const activeTasks = tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.deleted_at === null)
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3,
        background: 4,
      };
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      if (a.due_date && b.due_date)
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

  const slots: PlanSlot[] = [];
  let currentHour = 9;

  for (const task of activeTasks.slice(0, 8)) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const estimatedHours = task.priority === 'critical' || task.priority === 'high' ? 2 : 1;

    let reasoning: string;
    if (isOverdue) {
      reasoning = `Gecikmiş — son teslim ${new Date(task.due_date!).toLocaleDateString('tr-TR')}`;
    } else if (task.due_date) {
      const daysLeft = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86400000);
      reasoning = `Deadline'a ${daysLeft} gün kaldı`;
    } else if (task.priority === 'critical' || task.priority === 'high') {
      reasoning = `${task.priority === 'critical' ? 'Kritik' : 'Yüksek'} öncelikli`;
    } else {
      reasoning = 'Normal öncelik sırasında';
    }

    slots.push({
      startHour: currentHour,
      endHour: currentHour + estimatedHours,
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      reasoning,
    });

    currentHour += estimatedHours;
    if (currentHour >= 18) break;
  }

  return {
    date: new Date().toISOString().split('T')[0]!,
    slots,
    totalEstimatedMinutes: slots.reduce((s, slot) => s + (slot.endHour - slot.startHour) * 60, 0),
    generatedAt: new Date().toISOString(),
  };
}

export function generateWeeklyReview(
  taskSummary: TaskSummary,
  projectProgresses: { name: string; percent: number }[],
  productivityScore: number,
): WeeklyReview {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const nextWeekFocus: string[] = [];

  if (taskSummary.overdue > 0) {
    nextWeekFocus.push(`${taskSummary.overdue} gecikmiş görevi tamamla`);
  }

  const lowProgressProjects = projectProgresses.filter((p) => p.percent < 30);
  if (lowProgressProjects.length > 0) {
    nextWeekFocus.push(`${lowProgressProjects.map((p) => p.name).join(', ')} projelerine odaklan`);
  }

  if (taskSummary.highPriority > 3) {
    nextWeekFocus.push('Yüksek öncelikli görevleri azalt');
  }

  if (nextWeekFocus.length === 0) {
    nextWeekFocus.push('Mevcut tempoda devam et');
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0]!,
    weekEnd: weekEnd.toISOString().split('T')[0]!,
    completedTasks: taskSummary.completed,
    overdueTasks: taskSummary.overdue,
    projectProgress: projectProgresses,
    productivityScore,
    nextWeekFocus,
    generatedAt: new Date().toISOString(),
  };
}
