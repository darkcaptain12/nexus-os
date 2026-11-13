import type { PipelineOutput, PipelineStage, Recommendation, DailyPlan } from '../types';
import type { OrchestratorContext } from './context-pipeline';
import { generateRecommendations } from '../rule-engine';
import { runDecisionEngine } from '../decision-engine';
import { findOpportunities } from '../opportunity-engine';
import { prioritizeGoals } from '../goal-prioritizer';
import { generateEnergyPlan } from '../energy-planner';
import { getApprovalQueue } from '../approval-queue';

function makeStage(name: string): {
  stage: PipelineStage;
  done: (summary?: string) => void;
  fail: (err?: string) => void;
} {
  const stage: PipelineStage = { name, startAt: new Date().toISOString(), status: 'running' };
  return {
    stage,
    done: (summary?: string) => {
      stage.endAt = new Date().toISOString();
      stage.durationMs = new Date(stage.endAt).getTime() - new Date(stage.startAt).getTime();
      stage.status = 'done';
      stage.outputSummary = summary;
    },
    fail: (err?: string) => {
      stage.endAt = new Date().toISOString();
      stage.durationMs = new Date(stage.endAt).getTime() - new Date(stage.startAt).getTime();
      stage.status = 'failed';
      stage.outputSummary = err;
    },
  };
}

/**
 * Decision Pipeline — takes a pre-built OrchestratorContext and runs all AI
 * engines in order. No DB calls inside — everything comes from ctx.
 *
 * Stage order:
 *   1. Recommendations (rule-engine)
 *   2. Decision Engine (risks + recommendations → ExplainableDecision[])
 *   3. Opportunity Engine (tasks + projects → Opportunity[])
 *   4. Goal Prioritizer (goals → PrioritizedGoal[])
 *   5. Energy Planner (tasks + desktop activity → DailyPlan)
 *   6. Approval Queue (submit approval-required decisions)
 */
export async function runDecisionPipeline(ctx: OrchestratorContext): Promise<PipelineOutput> {
  const t0 = performance.now();
  const stages: PipelineStage[] = [];

  // Stage 1: Recommendations
  const s1 = makeStage('Recommendations');
  stages.push(s1.stage);
  let recommendations: Recommendation[] = [];
  try {
    recommendations = generateRecommendations({
      tasks: ctx.taskSummary,
      goals: ctx.goalSummary,
      calendar: { eventsToday: 0, eventsThisWeek: 0 },
      reminders: { upcoming: 0, overdueCount: 0 },
      system: ctx.system,
      modules: ctx.modules,
    });
    s1.done(`${recommendations.length} öneri`);
  } catch (e) {
    s1.fail(String(e));
  }

  // Stage 2: Decision Engine
  const s2 = makeStage('DecisionEngine');
  stages.push(s2.stage);
  let decisions = [] as ReturnType<typeof runDecisionEngine>;
  try {
    decisions = runDecisionEngine({
      risks: ctx.risks,
      recommendations,
      taskSummary: ctx.taskSummary,
      goalSummary: ctx.goalSummary,
    });
    s2.done(`${decisions.length} karar`);
  } catch (e) {
    s2.fail(String(e));
  }

  // Stage 3: Opportunity Engine
  const s3 = makeStage('OpportunityEngine');
  stages.push(s3.stage);
  let opportunities = [] as ReturnType<typeof findOpportunities>;
  try {
    opportunities = findOpportunities({
      tasks: ctx.tasks,
      projects: ctx.projects,
      taskSummary: ctx.taskSummary,
      productivityScore: ctx.productivity.score,
    });
    s3.done(`${opportunities.length} fırsat`);
  } catch (e) {
    s3.fail(String(e));
  }

  // Stage 4: Goal Prioritizer
  const s4 = makeStage('GoalPrioritizer');
  stages.push(s4.stage);
  let goalPriority = [] as ReturnType<typeof prioritizeGoals>;
  try {
    goalPriority = prioritizeGoals(ctx.goals);
    s4.done(`${goalPriority.length} hedef sıralandı`);
  } catch (e) {
    s4.fail(String(e));
  }

  // Stage 5: Energy Planner (enhanced with desktop activity)
  const s5 = makeStage('EnergyPlanner');
  stages.push(s5.stage);
  let energyPlan: DailyPlan;
  try {
    // If desktop shows heavy activity recently, boost low-energy tasks count
    const dominantApp = ctx.desktopTopApps[0];
    const heavyDesktopWork = dominantApp && dominantApp.seconds > 3600;
    const tasksForPlanning = heavyDesktopWork
      ? ctx.tasks.map((t) =>
          t.priority === 'low' || t.priority === 'normal'
            ? { ...t, _energyHint: 'prefer-low' as const }
            : t,
        )
      : ctx.tasks;
    energyPlan = generateEnergyPlan(tasksForPlanning);
    s5.done(`${energyPlan.slots.length} slot, ${energyPlan.totalEstimatedMinutes} dk`);
  } catch (e) {
    s5.fail(String(e));
    energyPlan = {
      date: new Date().toISOString().split('T')[0]!,
      slots: [],
      totalEstimatedMinutes: 0,
      generatedAt: new Date().toISOString(),
    } as DailyPlan;
  }

  // Stage 6: Approval Queue — submit decisions that require approval
  const s6 = makeStage('ApprovalQueue');
  stages.push(s6.stage);
  let pendingApprovals = [] as ReturnType<
    typeof getApprovalQueue
  >['getPending'] extends () => infer R
    ? R
    : never;
  try {
    const queue = getApprovalQueue();
    for (const d of decisions.filter((dec) => dec.requiresApproval)) {
      queue.propose({
        type: 'status_change',
        title: d.decision,
        description: d.reasoning,
        reasoning: `Güven: %${d.confidence} | Risk: ${d.risk} | Etki: ${d.impact}`,
        targetId: d.id,
        targetType: 'task',
        action: { decisionId: d.id, category: d.category },
      });
    }
    pendingApprovals = queue.getPending();
    s6.done(`${pendingApprovals.length} onay bekliyor`);
  } catch (e) {
    s6.fail(String(e));
  }

  const pipelineDurationMs = Math.round(performance.now() - t0);

  return {
    decisions,
    opportunities,
    goalPriority,
    recommendations,
    energyPlan,
    riskScore: ctx.riskScore,
    pendingApprovals,
    pipelineDurationMs,
    stages,
  };
}
