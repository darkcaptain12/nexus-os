import { describe, it, expect, beforeEach } from 'vitest';
import { runStartupChecks } from '../src/lib/supabase/startup';

describe('Startup Checks', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('runs in mock mode when supabase not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const report = await runStartupChecks(async () => ({
      from: () => ({}),
      auth: {},
      storage: {},
    }));

    expect(report.mode).toBe('development-mock');
    expect(report.ready).toBe(true);
  });

  it('includes environment check', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const report = await runStartupChecks(async () => ({
      from: () => ({}),
      auth: {},
      storage: {},
    }));

    const envCheck = report.checks.find((c) => c.name === 'environment');
    expect(envCheck).toBeDefined();
  });

  it('has timestamp', async () => {
    const report = await runStartupChecks(async () => ({
      from: () => ({}),
      auth: {},
      storage: {},
    }));
    expect(report.timestamp).toBeDefined();
  });
});
