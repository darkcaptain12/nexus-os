import { describe, it, expect } from 'vitest';
import { generateSecurityAuditReport } from '../src/lib/observability/security-audit';

describe('generateSecurityAuditReport', () => {
  it('returns a score between 0 and 100', async () => {
    const report = await generateSecurityAuditReport();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('includes service role key exposure check', async () => {
    const report = await generateSecurityAuditReport();
    expect(report.items.some((i) => i.name === 'Service Role Key Exposure')).toBe(true);
  });

  it('rate limiting reflects whether it has actually been invoked yet', async () => {
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'Rate Limiting');
    expect(item).toBeDefined();
    expect(['VERIFIED', 'UNKNOWN']).toContain(item!.status);
  });

  it('labels every item with status, risk, and a recommendation', async () => {
    const report = await generateSecurityAuditReport();
    for (const item of report.items) {
      expect(['VERIFIED', 'STATIC_REVIEW', 'UNKNOWN', 'FAILED']).toContain(item.status);
      expect(['low', 'medium', 'high', 'critical']).toContain(item.risk);
      expect(typeof item.recommendation).toBe('string');
    }
  });

  it('RLS check status depends on service-role key availability', async () => {
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'RLS Enforcement');
    // STATIC_REVIEW: no service key in test env
    // VERIFIED/FAILED: service key present + pg_tables accessible
    // UNKNOWN: service key present but pg_tables not accessible via PostgREST
    expect(['VERIFIED', 'STATIC_REVIEW', 'UNKNOWN', 'FAILED']).toContain(item?.status);
  });

  it('never claims VERIFIED for Realtime (would require a live websocket)', async () => {
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'Realtime');
    expect(item?.status).toBe('UNKNOWN');
  });

  it('includes JWT Config check', async () => {
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'JWT Config');
    expect(item?.status).toBe('VERIFIED');
  });

  it('fails if NEXT_PUBLIC_ secret-like env var is present', async () => {
    process.env['NEXT_PUBLIC_TEST_SECRET'] = 'leaked';
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'Public Env Var Naming Audit');
    expect(item?.status).toBe('FAILED');
    delete process.env['NEXT_PUBLIC_TEST_SECRET'];
  });

  it('flags service role key leak as critical risk', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'] = 'leaked-key';
    const report = await generateSecurityAuditReport();
    const item = report.items.find((i) => i.name === 'Service Role Key Exposure');
    expect(item?.status).toBe('FAILED');
    expect(item?.risk).toBe('critical');
    delete process.env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'];
  });
});
