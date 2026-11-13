import { describe, it, expect } from 'vitest';
import { getWorkerHealthRegistry } from '../src/lib/observability/worker-health';

describe('WorkerHealthRegistry', () => {
  it('pre-registers known workers with no data', () => {
    const registry = getWorkerHealthRegistry();
    const all = registry.getAllWorkerHealth();
    expect(all.length).toBeGreaterThanOrEqual(5);
    const notificationWorker = all.find((w) => w.name === 'notification-worker');
    expect(notificationWorker).toBeDefined();
  });

  it('reports hasData:false before any run is reported', () => {
    const registry = getWorkerHealthRegistry();
    const health = registry.getWorkerHealth('ai-worker');
    if (health.totalRuns === 0) {
      expect(health.hasData).toBe(false);
      expect(health.successRate).toBeNull();
    }
  });

  it('computes success rate from reported runs', () => {
    const registry = getWorkerHealthRegistry();
    registry.reportRun({ workerName: 'memory-worker', status: 'success', durationMs: 100 });
    registry.reportRun({ workerName: 'memory-worker', status: 'success', durationMs: 100 });
    registry.reportRun({
      workerName: 'memory-worker',
      status: 'failure',
      durationMs: 100,
      error: 'boom',
    });

    const health = registry.getWorkerHealth('memory-worker');
    expect(health.hasData).toBe(true);
    expect(health.totalRuns).toBe(3);
    expect(health.successRate).toBe(67);
    expect(health.failureCount).toBe(1);
  });

  it('tracks consecutive failures and resets on success', () => {
    const registry = getWorkerHealthRegistry();
    registry.reportRun({ workerName: 'automation-worker', status: 'failure', durationMs: 50 });
    registry.reportRun({ workerName: 'automation-worker', status: 'failure', durationMs: 50 });
    expect(registry.getWorkerHealth('automation-worker').consecutiveFailures).toBe(2);

    registry.reportRun({ workerName: 'automation-worker', status: 'success', durationMs: 50 });
    expect(registry.getWorkerHealth('automation-worker').consecutiveFailures).toBe(0);
  });

  it('tracks queue length independently of runs', () => {
    const registry = getWorkerHealthRegistry();
    registry.reportQueueLength('crawler-worker', 42);
    expect(registry.getWorkerHealth('crawler-worker').queueLength).toBe(42);
  });

  it('handles unknown worker name gracefully', () => {
    const registry = getWorkerHealthRegistry();
    const health = registry.getWorkerHealth('does-not-exist');
    expect(health.hasData).toBe(false);
  });
});
