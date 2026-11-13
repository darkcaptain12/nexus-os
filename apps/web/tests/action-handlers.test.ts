import { describe, it, expect } from 'vitest';
import { getAutomationMetrics } from '../src/lib/actions/metrics';

describe('AutomationMetrics', () => {
  it('returns metrics with health score', () => {
    const metrics = getAutomationMetrics();
    expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
    expect(metrics.healthScore).toBeLessThanOrEqual(100);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(metrics.health);
  });

  it('returns action stats', () => {
    const metrics = getAutomationMetrics();
    expect(metrics.actions.registered).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.actions.queued).toBe('number');
    expect(typeof metrics.actions.completed).toBe('number');
  });

  it('returns workflow stats', () => {
    const metrics = getAutomationMetrics();
    expect(typeof metrics.workflows.total).toBe('number');
    expect(typeof metrics.workflows.enabled).toBe('number');
  });

  it('health is healthy when no failures', () => {
    const metrics = getAutomationMetrics();
    expect(metrics.health).toBe('healthy');
  });
});
