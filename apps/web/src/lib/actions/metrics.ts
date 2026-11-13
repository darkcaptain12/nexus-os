import { getActionEngine } from './engine-instance';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

export interface AutomationMetrics {
  actions: {
    registered: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    pendingApproval: number;
    cancelled: number;
  };
  workflows: {
    total: number;
    enabled: number;
    running: number;
    todayExecutions: number;
    todayFailures: number;
  };
  health: 'healthy' | 'degraded' | 'unhealthy';
  healthScore: number;
}

export function getAutomationMetrics(): AutomationMetrics {
  const engine = getActionEngine();
  const actionStats = engine.getStats();

  const runtime = getWorkflowRuntime();
  const wfStats = runtime.getStats();

  const failRate =
    actionStats.completed > 0
      ? actionStats.failed / (actionStats.completed + actionStats.failed)
      : 0;

  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - failRate * 50 - actionStats.pendingApproval * 2)),
  );
  const health = healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy';

  return {
    actions: {
      registered: actionStats.registeredActions,
      queued: actionStats.queued,
      running: actionStats.running,
      completed: actionStats.completed,
      failed: actionStats.failed,
      pendingApproval: actionStats.pendingApproval,
      cancelled: actionStats.cancelled,
    },
    workflows: {
      total: wfStats.totalWorkflows,
      enabled: wfStats.enabledWorkflows,
      running: wfStats.running,
      todayExecutions: wfStats.todayExecutions,
      todayFailures: wfStats.todayFailures,
    },
    health,
    healthScore,
  };
}
