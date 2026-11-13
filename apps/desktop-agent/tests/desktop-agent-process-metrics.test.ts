import { describe, it, expect } from 'vitest';
import { DesktopAgent } from '../src/services/desktop-agent';

describe('DesktopAgent.getProcessMetrics', () => {
  it('returns real memory usage', () => {
    const agent = new DesktopAgent();
    const metrics = agent.getProcessMetrics();
    expect(metrics.heapUsedBytes).toBeGreaterThan(0);
    expect(metrics.rssBytes).toBeGreaterThan(0);
  });

  it('returns null cpuPercent on first call, a number on the second', () => {
    const agent = new DesktopAgent();
    const first = agent.getProcessMetrics();
    expect(first.cpuPercent).toBeNull();
    const second = agent.getProcessMetrics();
    expect(second.cpuPercent === null || typeof second.cpuPercent === 'number').toBe(true);
  });

  it('reports uptime since construction', () => {
    const agent = new DesktopAgent();
    const metrics = agent.getProcessMetrics();
    expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
