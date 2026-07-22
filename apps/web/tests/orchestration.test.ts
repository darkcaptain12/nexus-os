import { describe, it, expect } from 'vitest';
import { getStateMachine } from '../src/lib/ai/orchestrator/state-machine';
import { getCycleEngine } from '../src/lib/ai/orchestrator/cycle-engine';
import { getExecutiveTimeline } from '../src/lib/ai/orchestrator/executive-timeline';
import { runDecisionPipeline } from '../src/lib/ai/orchestrator/decision-pipeline';
import {
  recordCycleDecisions,
  generateCycleLearning,
} from '../src/lib/ai/orchestrator/learning-loop';
import type { OrchestratorContext } from '../src/lib/ai/orchestrator/context-pipeline';
import type { ExecutiveTimelineEntry } from '../src/lib/ai/types';

function makeMockContext(): OrchestratorContext {
  return {
    cycleId: crypto.randomUUID(),
    taskSummary: {
      total: 15,
      pending: 6,
      inProgress: 4,
      completed: 5,
      overdue: 2,
      dueToday: 2,
      highPriority: 3,
    },
    goalSummary: { total: 4, active: 3, completed: 1, averageProgress: 45 },
    tasks: [],
    projects: [],
    goals: [],
    system: {
      kernelPhase: 'running',
      healthScore: 88,
      servicesTotal: 5,
      servicesRunning: 5,
      servicesFailed: 0,
      eventsPublished: 200,
      commandsDispatched: 80,
      uptime: 7200,
      aiProviderConfigured: false,
      memoryEngineActive: true,
      agentSystemActive: false,
    },
    notifications: { unread: 3, total: 10 },
    modules: [],
    risks: [],
    productivity: {
      score: 65,
      breakdown: [],
      trend: 'declining',
      generatedAt: new Date().toISOString(),
    },
    riskScore: 35,
    desktopTopApps: [{ app: 'Terminal', seconds: 5400 }],
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
    buildDurationMs: 110,
  };
}

describe('Full Orchestration Flow (mocked context)', () => {
  it('runs complete pipeline flow without errors', async () => {
    const sm = getStateMachine();
    const ce = getCycleEngine();
    const tl = getExecutiveTimeline();

    sm.reset();
    const cycleId = crypto.randomUUID();
    const ctx = { ...makeMockContext(), cycleId };

    sm.transition('COLLECTING_CONTEXT');
    ce.startCycle(cycleId);

    sm.transition('ANALYZING');
    sm.transition('GENERATING_OPTIONS');

    const pipeline = await runDecisionPipeline(ctx);
    expect(pipeline.stages.length).toBeGreaterThan(0);

    if (pipeline.decisions.some((d) => d.requiresApproval)) {
      sm.tryTransition('WAITING_APPROVAL');
    }

    sm.tryTransition('LEARNING');
    recordCycleDecisions(cycleId, pipeline.decisions);
    const learning = generateCycleLearning(cycleId, pipeline.decisions);

    const entry: ExecutiveTimelineEntry = {
      cycleId,
      contextSummary: {
        taskCount: ctx.tasks.length,
        projectCount: ctx.projects.length,
        goalCount: ctx.goals.length,
        riskScore: ctx.riskScore,
        productivityScore: ctx.productivity.score,
        desktopActive: ctx.desktopTopApps.length > 0,
      },
      decisions: pipeline.decisions.map((d) => ({
        id: d.id,
        decision: d.decision,
        confidence: d.confidence,
        requiresApproval: d.requiresApproval,
      })),
      approvals: pipeline.pendingApprovals.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
      })),
      executions: [],
      learningInsight: learning.topInsight,
      stages: pipeline.stages,
      startAt: ctx.builtAt,
    };
    tl.add(entry);

    ce.completeCycle(cycleId, {
      decisionCount: pipeline.decisions.length,
      approvalCount: pipeline.pendingApprovals.length,
      executionCount: 0,
      failureCount: 0,
      confidenceAverage: 70,
      contextBuildMs: ctx.buildDurationMs,
      pipelineMs: pipeline.pipelineDurationMs,
      stages: pipeline.stages,
      state: 'IDLE',
    });
    sm.tryTransition('IDLE');

    expect(sm.getState()).toBe('IDLE');
    expect(tl.getByCycleId(cycleId)).toBeDefined();
    expect(learning.cycleId).toBe(cycleId);
  });

  it('state machine enforces correct sequence', () => {
    const sm = getStateMachine();
    sm.reset();
    expect(() => sm.transition('LEARNING')).toThrow(); // can't skip
    sm.transition('COLLECTING_CONTEXT');
    expect(() => sm.transition('IDLE')).toThrow(); // can't jump back
  });

  it('pipeline stages are named correctly', async () => {
    const ctx = makeMockContext();
    const output = await runDecisionPipeline(ctx);
    const names = output.stages.map((s) => s.name);
    expect(names).toContain('Recommendations');
    expect(names).toContain('DecisionEngine');
    expect(names).toContain('OpportunityEngine');
    expect(names).toContain('GoalPrioritizer');
    expect(names).toContain('EnergyPlanner');
    expect(names).toContain('ApprovalQueue');
  });

  it('timeline entry context summary has correct structure', async () => {
    const tl = getExecutiveTimeline();
    const ctx = makeMockContext();
    const pipeline = await runDecisionPipeline(ctx);
    const entry: ExecutiveTimelineEntry = {
      cycleId: ctx.cycleId,
      contextSummary: {
        taskCount: 15,
        projectCount: 3,
        goalCount: 4,
        riskScore: ctx.riskScore,
        productivityScore: ctx.productivity.score,
        desktopActive: true,
      },
      decisions: [],
      approvals: [],
      executions: [],
      stages: pipeline.stages,
      startAt: ctx.builtAt,
    };
    tl.add(entry);
    const found = tl.getByCycleId(ctx.cycleId);
    expect(found?.contextSummary.desktopActive).toBe(true);
    expect(found?.contextSummary.riskScore).toBe(35);
  });
});
