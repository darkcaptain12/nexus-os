import { describe, it, expect } from 'vitest';
import { generateRecommendations, generateBriefingSummary } from '../src/lib/ai/rule-engine';
import type { TaskSummary, GoalSummary, CalendarSummary, ReminderSummary, SystemState, ModuleStatus } from '../src/lib/ai/types';

function makeContext(overrides?: {
  tasks?: Partial<TaskSummary>;
  goals?: Partial<GoalSummary>;
  calendar?: Partial<CalendarSummary>;
  reminders?: Partial<ReminderSummary>;
  system?: Partial<SystemState>;
  modules?: ModuleStatus[];
}) {
  return {
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, dueToday: 0, highPriority: 0, ...overrides?.tasks },
    goals: { total: 0, active: 0, completed: 0, averageProgress: 0, ...overrides?.goals },
    calendar: { eventsToday: 0, eventsThisWeek: 0, ...overrides?.calendar },
    reminders: { upcoming: 0, overdueCount: 0, ...overrides?.reminders },
    system: {
      kernelPhase: 'running', healthScore: 100, servicesTotal: 8, servicesRunning: 8,
      servicesFailed: 0, eventsPublished: 1, commandsDispatched: 0, uptime: 1000,
      aiProviderConfigured: false, memoryEngineActive: false, agentSystemActive: false,
      ...overrides?.system,
    },
    modules: overrides?.modules ?? [
      { name: 'Kernel', enabled: true, status: 'active' as const },
    ],
  };
}

describe('Rule Engine - generateRecommendations', () => {
  it('generates "no tasks" recommendation when empty', () => {
    const recs = generateRecommendations(makeContext());
    const noTasks = recs.find((r) => r.id === 'no-tasks');
    expect(noTasks).toBeDefined();
    expect(noTasks!.category).toBe('productivity');
  });

  it('generates overdue task recommendation', () => {
    const recs = generateRecommendations(makeContext({ tasks: { total: 5, overdue: 2 } }));
    const overdue = recs.find((r) => r.id === 'overdue-tasks');
    expect(overdue).toBeDefined();
    expect(overdue!.score).toBe(95);
    expect(overdue!.priority).toBe(1);
  });

  it('generates due-today recommendation', () => {
    const recs = generateRecommendations(makeContext({ tasks: { total: 3, dueToday: 2 } }));
    const dueToday = recs.find((r) => r.id === 'due-today');
    expect(dueToday).toBeDefined();
  });

  it('generates high-priority recommendation', () => {
    const recs = generateRecommendations(makeContext({ tasks: { total: 5, highPriority: 3 } }));
    const hp = recs.find((r) => r.id === 'high-priority');
    expect(hp).toBeDefined();
  });

  it('generates goal-related recommendations', () => {
    const recs = generateRecommendations(makeContext({ goals: { total: 0 } }));
    expect(recs.find((r) => r.id === 'no-goals')).toBeDefined();
  });

  it('generates low goal progress recommendation', () => {
    const recs = generateRecommendations(makeContext({ goals: { total: 3, active: 3, averageProgress: 10 } }));
    expect(recs.find((r) => r.id === 'low-goal-progress')).toBeDefined();
  });

  it('generates system health recommendation when degraded', () => {
    const recs = generateRecommendations(makeContext({ system: { healthScore: 50 } }));
    expect(recs.find((r) => r.id === 'system-health')).toBeDefined();
  });

  it('generates failed services recommendation', () => {
    const recs = generateRecommendations(makeContext({ system: { servicesFailed: 2 } }));
    const failed = recs.find((r) => r.id === 'failed-services');
    expect(failed).toBeDefined();
    expect(failed!.score).toBe(98);
  });

  it('generates overdue reminders recommendation', () => {
    const recs = generateRecommendations(makeContext({ reminders: { overdueCount: 3 } }));
    expect(recs.find((r) => r.id === 'overdue-reminders')).toBeDefined();
  });

  it('generates unconfigured modules recommendation', () => {
    const recs = generateRecommendations(makeContext({
      modules: [
        { name: 'AI', enabled: false, status: 'unconfigured' },
        { name: 'Bellek', enabled: false, status: 'unconfigured' },
      ],
    }));
    expect(recs.find((r) => r.id === 'configure-modules')).toBeDefined();
  });

  it('sorts recommendations by score descending', () => {
    const recs = generateRecommendations(makeContext({
      tasks: { total: 5, overdue: 1, dueToday: 2, highPriority: 1 },
    }));
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1]!.score).toBeGreaterThanOrEqual(recs[i]!.score);
    }
  });

  it('generates calendar recommendation for next event', () => {
    const recs = generateRecommendations(makeContext({
      calendar: { eventsToday: 1, nextEvent: { title: 'Toplantı', startAt: new Date().toISOString() } },
    }));
    expect(recs.find((r) => r.id === 'next-event')).toBeDefined();
  });
});

describe('Rule Engine - generateBriefingSummary', () => {
  it('generates greeting with user name', () => {
    const summary = generateBriefingSummary({
      userName: 'Emir',
      tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, dueToday: 0, highPriority: 0 },
      goals: { total: 0, active: 0, completed: 0, averageProgress: 0 },
      calendar: { eventsToday: 0, eventsThisWeek: 0 },
      reminders: { upcoming: 0, overdueCount: 0 },
      system: {
        kernelPhase: 'running', healthScore: 100, servicesTotal: 8, servicesRunning: 8,
        servicesFailed: 0, eventsPublished: 0, commandsDispatched: 0, uptime: 0,
        aiProviderConfigured: false, memoryEngineActive: false, agentSystemActive: false,
      },
      notifications: { unread: 0 },
    });

    expect(summary[0]).toContain('Emir');
    expect(summary.some((l) => l.includes('görev'))).toBe(true);
    expect(summary.some((l) => l.includes('Sistem sağlığı'))).toBe(true);
  });

  it('includes overdue warning', () => {
    const summary = generateBriefingSummary({
      userName: 'Test',
      tasks: { total: 5, pending: 2, inProgress: 1, completed: 1, overdue: 3, dueToday: 0, highPriority: 0 },
      goals: { total: 0, active: 0, completed: 0, averageProgress: 0 },
      calendar: { eventsToday: 0, eventsThisWeek: 0 },
      reminders: { upcoming: 0, overdueCount: 0 },
      system: {
        kernelPhase: 'running', healthScore: 100, servicesTotal: 8, servicesRunning: 8,
        servicesFailed: 0, eventsPublished: 0, commandsDispatched: 0, uptime: 0,
        aiProviderConfigured: false, memoryEngineActive: false, agentSystemActive: false,
      },
      notifications: { unread: 0 },
    });

    expect(summary.some((l) => l.includes('gecikmiş'))).toBe(true);
  });

  it('mentions unread notifications', () => {
    const summary = generateBriefingSummary({
      userName: 'Test',
      tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, dueToday: 0, highPriority: 0 },
      goals: { total: 0, active: 0, completed: 0, averageProgress: 0 },
      calendar: { eventsToday: 0, eventsThisWeek: 0 },
      reminders: { upcoming: 0, overdueCount: 0 },
      system: {
        kernelPhase: 'running', healthScore: 100, servicesTotal: 8, servicesRunning: 8,
        servicesFailed: 0, eventsPublished: 0, commandsDispatched: 0, uptime: 0,
        aiProviderConfigured: false, memoryEngineActive: false, agentSystemActive: false,
      },
      notifications: { unread: 5 },
    });

    expect(summary.some((l) => l.includes('5 okunmamış'))).toBe(true);
  });
});
