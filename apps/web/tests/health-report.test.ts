import { describe, it, expect } from 'vitest';
import { generateHealthReport } from '../src/lib/observability/health';

describe('generateHealthReport', () => {
  it('produces a score between 0 and 100', async () => {
    const report = await generateHealthReport();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('maps score to a severity label', async () => {
    const report = await generateHealthReport();
    expect(['Healthy', 'Warning', 'Critical']).toContain(report.severity);
  });

  it('merges kernel checks with domain checks into one list', async () => {
    const report = await generateHealthReport();
    const names = report.checks.map((c) => c.name);
    // kernel's own checks
    expect(names).toContain('memory');
    // domain checks registered in this sprint
    expect(names).toContain('Database');
    expect(names).toContain('AI Provider');
    expect(names).toContain('Action Engine');
    expect(names).toContain('Integration Hub');
    expect(names).toContain('Workflow Runtime');
    expect(names).toContain('Memory Engine');
  });

  it('includes real system stats', async () => {
    const report = await generateHealthReport();
    expect(report.system.memoryUsedMb).toBeGreaterThan(0);
    expect(report.system.nodeVersion).toMatch(/^v\d+/);
    expect(['darwin', 'linux', 'win32']).toContain(report.system.platform);
  });

  it('every check has a valid status', async () => {
    const report = await generateHealthReport();
    for (const check of report.checks) {
      expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(check.status);
    }
  });
});
