import { describe, it, expect } from 'vitest';
import { runDecisionPipeline } from '../src/lib/ai/orchestrator/decision-pipeline';
import type { OrchestratorContext } from '../src/lib/ai/orchestrator/context-pipeline';

function makeMockContext(): OrchestratorContext {
  return {
    cycleId: crypto.randomUUID(),
    taskSummary: {
      total: 8,
      pending: 3,
      inProgress: 2,
      completed: 3,
      overdue: 1,
      dueToday: 1,
      highPriority: 2,
    },
    goalSummary: { total: 2, active: 1, completed: 1, averageProgress: 60 },
    tasks: [],
    projects: [],
    goals: [],
    system: {
      kernelPhase: 'running',
      healthScore: 90,
      servicesTotal: 5,
      servicesRunning: 5,
      servicesFailed: 0,
      eventsPublished: 50,
      commandsDispatched: 20,
      uptime: 1800,
      aiProviderConfigured: false,
      memoryEngineActive: true,
      agentSystemActive: false,
    },
    notifications: { unread: 0, total: 0 },
    modules: [],
    risks: [],
    productivity: {
      score: 68,
      breakdown: [],
      trend: 'stable',
      generatedAt: new Date().toISOString(),
    },
    riskScore: 25,
    desktopTopApps: [],
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
    buildDurationMs: 90,
  };
}

describe('Decision Pipeline', () => {
  it('returns PipelineOutput with all required fields', async () => {
    const output = await runDecisionPipeline(makeMockContext());
    expect(Array.isArray(output.decisions)).toBe(true);
    expect(Array.isArray(output.opportunities)).toBe(true);
    expect(Array.isArray(output.goalPriority)).toBe(true);
    expect(Array.isArray(output.recommendations)).toBe(true);
    expect(output.energyPlan).toBeDefined();
    expect(typeof output.riskScore).toBe('number');
    expect(Array.isArray(output.pendingApprovals)).toBe(true);
    expect(typeof output.pipelineDurationMs).toBe('number');
    expect(Array.isArray(output.stages)).toBe(true);
  });

  it('has 6 stages', async () => {
    const output = await runDecisionPipeline(makeMockContext());
    expect(output.stages).toHaveLength(6);
  });

  it('all stages have valid status', async () => {
    const output = await runDecisionPipeline(makeMockContext());
    for (const stage of output.stages) {
      expect(['done', 'failed', 'running', 'pending']).toContain(stage.status);
      expect(stage.name).toBeTruthy();
      expect(stage.startAt).toBeTruthy();
    }
  });

  it('pipelineDurationMs is positive', async () => {
    const output = await runDecisionPipeline(makeMockContext());
    expect(output.pipelineDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('energyPlan has date field', async () => {
    const output = await runDecisionPipeline(makeMockContext());
    expect(output.energyPlan.date).toBeTruthy();
    expect(Array.isArray(output.energyPlan.slots)).toBe(true);
  });

  it('riskScore matches context riskScore', async () => {
    const ctx = makeMockContext();
    ctx.riskScore = 42;
    const output = await runDecisionPipeline(ctx);
    expect(output.riskScore).toBe(42);
  });
});
