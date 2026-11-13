import { describe, it, expect } from 'vitest';
import type { OrchestratorContext } from '../src/lib/ai/orchestrator/context-pipeline';

// Context pipeline makes real DB calls — test the shape contract only
// using a mock context that matches the interface exactly.
function makeMockContext(overrides: Partial<OrchestratorContext> = {}): OrchestratorContext {
  return {
    cycleId: crypto.randomUUID(),
    taskSummary: {
      total: 10,
      pending: 4,
      inProgress: 2,
      completed: 4,
      overdue: 0,
      dueToday: 1,
      highPriority: 2,
    },
    goalSummary: { total: 3, active: 2, completed: 1, averageProgress: 55 },
    tasks: [],
    projects: [],
    goals: [],
    system: {
      kernelPhase: 'running',
      healthScore: 95,
      servicesTotal: 5,
      servicesRunning: 5,
      servicesFailed: 0,
      eventsPublished: 100,
      commandsDispatched: 50,
      uptime: 3600,
      aiProviderConfigured: false,
      memoryEngineActive: true,
      agentSystemActive: false,
    },
    notifications: { unread: 2, total: 5 },
    modules: [{ name: 'Görevler', enabled: true, status: 'active' }],
    risks: [],
    productivity: {
      score: 72,
      breakdown: [],
      trend: 'stable',
      generatedAt: new Date().toISOString(),
    },
    riskScore: 20,
    desktopTopApps: [{ app: 'VS Code', seconds: 3600 }],
    builtAt: new Date().toISOString(),
    knowledge: {
      topic: 'test',
      nodes: [],
      relations: [],
      selectedAt: new Date().toISOString(),
      durationMs: 0,
    },
    desktop: {
      window: null,
      recentOcr: [],
      recentClipboard: [],
      recentFiles: [],
      activeProject: null,
      health: {
        ocrProvider: 'client-native',
        ocrProvidersAvailable: ['client-native'],
        ocrQueueLength: 0,
        ocrProcessedTotal: 0,
        ocrFailedTotal: 0,
        averageOcrMs: 0,
        clipboardEntries: 0,
        fileInsightsTotal: 0,
        lastAnalysisAt: null,
        triggerMode: 'on-change' as const,
        cpuFriendly: true,
        generatedAt: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    },
    buildDurationMs: 85,
    ...overrides,
  };
}

describe('OrchestratorContext (contract)', () => {
  it('has all required fields', () => {
    const ctx = makeMockContext();
    expect(ctx.cycleId).toBeTruthy();
    expect(ctx.taskSummary).toBeDefined();
    expect(ctx.goalSummary).toBeDefined();
    expect(Array.isArray(ctx.tasks)).toBe(true);
    expect(Array.isArray(ctx.projects)).toBe(true);
    expect(Array.isArray(ctx.goals)).toBe(true);
    expect(ctx.system).toBeDefined();
    expect(ctx.notifications).toBeDefined();
    expect(Array.isArray(ctx.modules)).toBe(true);
    expect(Array.isArray(ctx.risks)).toBe(true);
    expect(ctx.productivity).toBeDefined();
    expect(typeof ctx.riskScore).toBe('number');
    expect(Array.isArray(ctx.desktopTopApps)).toBe(true);
    expect(ctx.builtAt).toBeTruthy();
    expect(typeof ctx.buildDurationMs).toBe('number');
  });

  it('riskScore is between 0 and 100', () => {
    const ctx = makeMockContext({ riskScore: 45 });
    expect(ctx.riskScore).toBeGreaterThanOrEqual(0);
    expect(ctx.riskScore).toBeLessThanOrEqual(100);
  });

  it('productivity score is between 0 and 100', () => {
    const ctx = makeMockContext();
    expect(ctx.productivity.score).toBeGreaterThanOrEqual(0);
    expect(ctx.productivity.score).toBeLessThanOrEqual(100);
  });

  it('desktopTopApps structure is correct', () => {
    const ctx = makeMockContext({ desktopTopApps: [{ app: 'VS Code', seconds: 7200 }] });
    expect(ctx.desktopTopApps[0]!.app).toBe('VS Code');
    expect(ctx.desktopTopApps[0]!.seconds).toBe(7200);
  });

  it('system has all required fields', () => {
    const ctx = makeMockContext();
    expect(typeof ctx.system.healthScore).toBe('number');
    expect(typeof ctx.system.kernelPhase).toBe('string');
    expect(typeof ctx.system.aiProviderConfigured).toBe('boolean');
  });
});
