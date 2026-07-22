import { describe, it, expect, beforeEach } from 'vitest';
import { getQueryAuditor } from '../src/lib/repositories/query-audit';

describe('QueryAuditor', () => {
  beforeEach(() => {
    // fresh state per test by clearing via a new logical window —
    // the singleton accumulates, so we just check relative behavior
  });

  it('detects slow queries above 200ms', () => {
    const auditor = getQueryAuditor();
    auditor.record('test_table_slow', 'findById', 250);
    const slow = auditor.getSlowQueries();
    expect(slow.some((q) => q.table === 'test_table_slow' && q.durationMs === 250)).toBe(true);
  });

  it('does not flag fast queries as slow', () => {
    const auditor = getQueryAuditor();
    auditor.record('test_table_fast', 'findById', 50);
    const slow = auditor.getSlowQueries();
    expect(slow.some((q) => q.table === 'test_table_fast')).toBe(false);
  });

  it('detects N+1 suspect on repeated calls within window', () => {
    const auditor = getQueryAuditor();
    for (let i = 0; i < 6; i++) {
      auditor.record('test_table_nplus1', 'findById', 10);
    }
    const suspects = auditor.getNPlusOneSuspects();
    expect(suspects.some((s) => s.signature === 'test_table_nplus1:findById')).toBe(true);
  });

  it('does not flag occasional calls as N+1', () => {
    const auditor = getQueryAuditor();
    auditor.record('test_table_occasional', 'findById', 10);
    const suspects = auditor.getNPlusOneSuspects();
    expect(suspects.some((s) => s.signature === 'test_table_occasional:findById')).toBe(false);
  });

  it('report includes totals and averages', () => {
    const auditor = getQueryAuditor();
    auditor.record('test_table_report', 'create', 30);
    auditor.record('test_table_report', 'create', 50);
    const report = auditor.getReport();
    expect(report.totalQueries).toBeGreaterThan(0);
    expect(report.avgDurationMs).toBeGreaterThanOrEqual(0);
  });
});
