import type {
  ExecutiveTimelineEntry,
  CycleLearning,
  ExecutiveCycle,
  PipelineOutput,
} from '../types';
import { buildOrchestratorContext } from './context-pipeline';
import { getStateMachine } from './state-machine';
import { getCycleEngine } from './cycle-engine';
import { runDecisionPipeline } from './decision-pipeline';
import { recordCycleDecisions, generateCycleLearning } from './learning-loop';
import { getExecutiveTimeline } from './executive-timeline';

export interface LoopRunResult {
  cycle: ExecutiveCycle;
  contextSummary: {
    taskCount: number;
    projectCount: number;
    goalCount: number;
    riskScore: number;
    productivityScore: number;
    buildDurationMs: number;
    desktopActive: boolean;
  };
  pipeline: PipelineOutput;
  learning: CycleLearning;
  timelineEntry: ExecutiveTimelineEntry;
  totalDurationMs: number;
}

/**
 * runExecutiveCycle — the single entry point for Sprint 12 orchestration.
 *
 * Execution order:
 *   IDLE → COLLECTING_CONTEXT → buildOrchestratorContext() (single DB pass)
 *   → ANALYZING → GENERATING_OPTIONS → runDecisionPipeline()
 *   → WAITING_APPROVAL (if decisions need approval)
 *   → LEARNING → recordCycleDecisions + generateCycleLearning
 *   → IDLE
 *
 * The context is built ONCE and passed through every engine.
 * No engine fetches DB independently.
 */
export async function runExecutiveCycle(): Promise<LoopRunResult> {
  const t0 = performance.now();
  const cycleId = crypto.randomUUID();
  const sm = getStateMachine();
  const ce = getCycleEngine();
  const timeline = getExecutiveTimeline();

  // Ensure we start from IDLE (reset if stuck in previous failed state)
  if (sm.getState() !== 'IDLE') {
    sm.reset();
  }

  ce.startCycle(cycleId);

  try {
    // ─── Phase 1: Collect Context ───────────────────────────────────────────
    sm.transition('COLLECTING_CONTEXT', 'Orchestrator cycle started');
    const ctx = await buildOrchestratorContext(cycleId);
    ce.updateCycle(cycleId, { contextBuildMs: ctx.buildDurationMs });

    // ─── Phase 2: Analyze ───────────────────────────────────────────────────
    sm.transition('ANALYZING', `Context built in ${ctx.buildDurationMs}ms`);

    // ─── Phase 3: Generate Options ──────────────────────────────────────────
    sm.transition('GENERATING_OPTIONS', `${ctx.risks.length} risks, ${ctx.tasks.length} tasks`);
    const pipeline = await runDecisionPipeline(ctx);
    ce.updateCycle(cycleId, { pipelineMs: pipeline.pipelineDurationMs });

    // ─── Phase 4: Waiting Approval (if needed) ──────────────────────────────
    const requiresApproval = pipeline.decisions.filter((d) => d.requiresApproval);
    if (requiresApproval.length > 0) {
      sm.transition('WAITING_APPROVAL', `${requiresApproval.length} decisions need approval`);
    }

    // ─── Phase 5: Learning ──────────────────────────────────────────────────
    sm.transition('LEARNING', 'Pipeline complete, recording outcomes');
    recordCycleDecisions(cycleId, pipeline.decisions);
    const learning = generateCycleLearning(cycleId, pipeline.decisions);

    // ─── Record Timeline ────────────────────────────────────────────────────
    const timelineEntry: ExecutiveTimelineEntry = {
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
    timeline.add(timelineEntry);

    // ─── Complete Cycle ─────────────────────────────────────────────────────
    const avgConfidence =
      pipeline.decisions.length > 0
        ? Math.round(
            pipeline.decisions.reduce((s, d) => s + d.confidence, 0) / pipeline.decisions.length,
          )
        : 0;

    const completedCycle = ce.completeCycle(cycleId, {
      decisionCount: pipeline.decisions.length,
      approvalCount: pipeline.pendingApprovals.length,
      executionCount: 0,
      failureCount: pipeline.stages.filter((s) => s.status === 'failed').length,
      confidenceAverage: avgConfidence,
      contextBuildMs: ctx.buildDurationMs,
      pipelineMs: pipeline.pipelineDurationMs,
      stages: pipeline.stages,
      insight: learning.topInsight,
      state: 'IDLE',
    })!;

    timeline.update(cycleId, {
      endAt: completedCycle.finishAt,
      durationMs: completedCycle.durationMs,
    });

    sm.transition('IDLE', `Cycle ${cycleId} complete`);

    const totalDurationMs = Math.round(performance.now() - t0);

    return {
      cycle: completedCycle,
      contextSummary: {
        taskCount: ctx.tasks.length,
        projectCount: ctx.projects.length,
        goalCount: ctx.goals.length,
        riskScore: ctx.riskScore,
        productivityScore: ctx.productivity.score,
        buildDurationMs: ctx.buildDurationMs,
        desktopActive: ctx.desktopTopApps.length > 0,
      },
      pipeline,
      learning,
      timelineEntry,
      totalDurationMs,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    ce.failCycle(cycleId, reason);
    sm.tryTransition('FAILED', reason);
    sm.tryTransition('IDLE', 'Recovering after failure');
    throw err;
  }
}
