import type { DailyPlan, PlanSlot } from './types';
import type { TaskRecord } from '@/lib/repositories';

interface EnergyBlock {
  startHour: number;
  endHour: number;
  label: string;
  energyLevel: 'peak' | 'medium' | 'low';
  preferredPriority: ('critical' | 'high' | 'normal' | 'low')[];
}

const ENERGY_BLOCKS: EnergyBlock[] = [
  {
    startHour: 9,
    endHour: 11,
    label: 'Deep Work',
    energyLevel: 'peak',
    preferredPriority: ['critical', 'high'],
  },
  {
    startHour: 11,
    endHour: 12,
    label: 'Communication',
    energyLevel: 'medium',
    preferredPriority: ['normal'],
  },
  {
    startHour: 13,
    endHour: 15,
    label: 'Focused Work',
    energyLevel: 'medium',
    preferredPriority: ['high', 'normal'],
  },
  {
    startHour: 15,
    endHour: 17,
    label: 'Low-Energy Tasks',
    energyLevel: 'low',
    preferredPriority: ['low', 'normal'],
  },
];

const PRIORITY_ENERGY: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };

function scoredTasksForBlock(
  tasks: TaskRecord[],
  block: EnergyBlock,
  usedIds: Set<string>,
): TaskRecord[] {
  const active = tasks.filter(
    (t) =>
      !usedIds.has(t.id) &&
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.deleted_at === null,
  );

  const preferred = active.filter((t) => block.preferredPriority.includes(t.priority as never));
  const fallback = active.filter((t) => !block.preferredPriority.includes(t.priority as never));

  const sorted = (arr: TaskRecord[]) =>
    arr.sort((a, b) => (PRIORITY_ENERGY[b.priority] ?? 0) - (PRIORITY_ENERGY[a.priority] ?? 0));

  return [...sorted(preferred), ...sorted(fallback)];
}

function blockReasoning(block: EnergyBlock, task: TaskRecord): string {
  const energyLabel =
    block.energyLevel === 'peak'
      ? 'Zihin en verimli saatte'
      : block.energyLevel === 'medium'
        ? 'Orta enerji bloğu'
        : 'Düşük enerji saati';
  const priorityNote =
    task.priority === 'critical'
      ? '— kritik görev'
      : task.priority === 'high'
        ? '— yüksek öncelik'
        : '';
  const overdueNote = task.due_date && new Date(task.due_date) < new Date() ? ' (OVERDUE)' : '';
  return `${energyLabel} ${priorityNote}${overdueNote}. ${block.label} bloğuna uygun.`;
}

/**
 * Energy-optimized daily planner.
 * Assigns tasks to time blocks based on energy level:
 * 09-11 Deep Work (peak), 11-12 Communication (medium),
 * 13-15 Focused Work (medium), 15-17 Low-Energy Tasks (low).
 */
export function generateEnergyPlan(tasks: TaskRecord[]): DailyPlan {
  const slots: PlanSlot[] = [];
  const usedIds = new Set<string>();
  let totalMinutes = 0;

  const overdueFirst = [...tasks].sort((a, b) => {
    const aOverdue = a.due_date && new Date(a.due_date) < new Date() ? 1 : 0;
    const bOverdue = b.due_date && new Date(b.due_date) < new Date() ? 1 : 0;
    return (
      bOverdue - aOverdue || (PRIORITY_ENERGY[b.priority] ?? 0) - (PRIORITY_ENERGY[a.priority] ?? 0)
    );
  });

  for (const block of ENERGY_BLOCKS) {
    const blockMinutes = (block.endHour - block.startHour) * 60;
    const candidates = scoredTasksForBlock(overdueFirst, block, usedIds);
    let allocated = 0;
    const blockTasks: TaskRecord[] = [];

    for (const task of candidates) {
      if (allocated >= blockMinutes) break;
      blockTasks.push(task);
      usedIds.add(task.id);
      allocated += 45;
    }

    if (blockTasks.length === 0) {
      slots.push({
        startHour: block.startHour,
        endHour: block.endHour,
        taskTitle: `${block.label} — Serbest Blok`,
        priority: 'normal',
        reasoning: `${block.label} bloğu — planlanmış görev yok. Yeni iş alabilirsiniz.`,
      });
      totalMinutes += blockMinutes;
    } else {
      let cursor = block.startHour * 60;
      for (const task of blockTasks) {
        const taskMins = Math.min(45, block.endHour * 60 - cursor);
        if (taskMins <= 0) break;
        const startH = Math.floor(cursor / 60);
        const endH = Math.ceil((cursor + taskMins) / 60);
        slots.push({
          startHour: startH,
          endHour: Math.min(endH, block.endHour),
          taskId: task.id,
          taskTitle: task.title,
          priority: task.priority,
          reasoning: blockReasoning(block, task),
        });
        cursor += taskMins;
        totalMinutes += taskMins;
      }
    }
  }

  return {
    date: new Date().toISOString().split('T')[0]!,
    slots,
    totalEstimatedMinutes: totalMinutes,
    generatedAt: new Date().toISOString(),
  };
}
