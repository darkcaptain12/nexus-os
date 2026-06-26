import type {
  UserState,
  SystemState,
  TaskSummary,
  GoalSummary,
  CalendarSummary,
  ReminderSummary,
  NotificationSummary,
  ModuleStatus,
  DailyBriefing,
  Recommendation,
  AIExecutiveStatus,
} from './types';
import { generateRecommendations, generateBriefingSummary } from './rule-engine';
import { getKernel } from '@/lib/kernel';
import { createRepositories } from '@/lib/repositories';
import { createClient } from '@/lib/supabase/server';

let lastExecutionAt: string | undefined;
let lastExecutionDurationMs: number | undefined;
let totalExecutions = 0;

function getModules(): ModuleStatus[] {
  return [
    { name: 'Kernel', enabled: true, status: 'active' },
    { name: 'Event Bus', enabled: true, status: 'active' },
    { name: 'Görevler', enabled: true, status: 'active' },
    { name: 'Projeler', enabled: true, status: 'active' },
    { name: 'Bellek', enabled: true, status: 'active' },
    { name: 'Yapay Zeka', enabled: false, status: 'unconfigured' },
    { name: 'Trading', enabled: false, status: 'disabled' },
    { name: 'E-Ticaret', enabled: false, status: 'disabled' },
    { name: 'Otomasyon', enabled: false, status: 'unconfigured' },
    { name: 'Bildirimler', enabled: true, status: 'active' },
  ];
}

async function getSystemState(): Promise<SystemState> {
  const { kernel, ready } = getKernel();
  await ready;
  const status = kernel.getStatus();
  return {
    kernelPhase: status.phase,
    healthScore: status.health,
    servicesTotal: status.services.total,
    servicesRunning: status.services.running,
    servicesFailed: status.services.failed,
    eventsPublished: status.events.published,
    commandsDispatched: status.commands.dispatched,
    uptime: status.uptime,
    aiProviderConfigured: false,
    memoryEngineActive: true,
    agentSystemActive: false,
  };
}

async function getTaskSummary(): Promise<TaskSummary> {
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    return await repos.tasks.getSummary();
  } catch {
    return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, dueToday: 0, highPriority: 0 };
  }
}

async function getGoalSummary(): Promise<GoalSummary> {
  try {
    const supabase = await createClient();
    const repos = createRepositories(supabase);
    return await repos.goals.getSummary();
  } catch {
    return { total: 0, active: 0, completed: 0, averageProgress: 0 };
  }
}

async function getNotificationSummary(): Promise<NotificationSummary> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
      .is('deleted_at', null);
    return { unread: count ?? 0, total: 0 };
  } catch {
    return { unread: 0, total: 0 };
  }
}

export async function generateDailyBriefing(user: UserState): Promise<DailyBriefing> {
  const start = performance.now();

  const [system, tasks, goals, notifications] = await Promise.all([
    getSystemState(),
    getTaskSummary(),
    getGoalSummary(),
    getNotificationSummary(),
  ]);

  const calendar: CalendarSummary = { eventsToday: 0, eventsThisWeek: 0 };
  const reminders: ReminderSummary = { upcoming: 0, overdueCount: 0 };
  const modules = getModules();

  const summary = generateBriefingSummary({
    userName: user.name,
    tasks,
    goals,
    calendar,
    reminders,
    system,
    notifications,
  });

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  const durationMs = Math.round(performance.now() - start);
  totalExecutions++;
  lastExecutionAt = new Date().toISOString();
  lastExecutionDurationMs = durationMs;

  return {
    greeting: `${greeting}, ${user.name}`,
    date: new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    summary,
    taskSummary: tasks,
    goalSummary: goals,
    calendarSummary: calendar,
    reminderSummary: reminders,
    systemHealth: system,
    modules,
    generatedAt: new Date().toISOString(),
    generatedBy: 'rule-engine',
    durationMs,
  };
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const start = performance.now();

  const [system, tasks, goals] = await Promise.all([
    getSystemState(),
    getTaskSummary(),
    getGoalSummary(),
  ]);

  const calendar: CalendarSummary = { eventsToday: 0, eventsThisWeek: 0 };
  const reminders: ReminderSummary = { upcoming: 0, overdueCount: 0 };
  const modules = getModules();

  const recommendations = generateRecommendations({
    tasks,
    goals,
    calendar,
    reminders,
    system,
    modules,
  });

  totalExecutions++;
  lastExecutionAt = new Date().toISOString();
  lastExecutionDurationMs = Math.round(performance.now() - start);

  return recommendations;
}

export async function getAIExecutiveStatus(): Promise<AIExecutiveStatus> {
  const system = await getSystemState();
  return {
    mode: 'rule-engine',
    kernelPhase: system.kernelPhase,
    healthScore: system.healthScore,
    memoryActive: system.memoryEngineActive,
    agentsActive: system.agentSystemActive,
    lastExecutionAt,
    lastExecutionDurationMs,
    totalExecutions,
    fallbackMode: !system.aiProviderConfigured,
  };
}
