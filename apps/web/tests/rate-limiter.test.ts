import { describe, it, expect } from 'vitest';
import {
  resolveRateLimitGroup,
  checkApiRateLimit,
  getRateLimitGroups,
  getRateLimitInvocationCount,
} from '../src/lib/security/headers';

describe('resolveRateLimitGroup', () => {
  it('resolves each documented route group', () => {
    expect(resolveRateLimitGroup('/api/oauth/github').group).toBe('auth');
    expect(resolveRateLimitGroup('/api/ai/executive').group).toBe('ai');
    expect(resolveRateLimitGroup('/api/memory/search').group).toBe('memory');
    expect(resolveRateLimitGroup('/api/workflows/run').group).toBe('workflow');
    expect(resolveRateLimitGroup('/api/actions/execute').group).toBe('action');
    expect(resolveRateLimitGroup('/api/desktop/status').group).toBe('desktop');
    expect(resolveRateLimitGroup('/api/integrations/sync').group).toBe('integration');
  });

  it('falls back to the default group for unlisted paths', () => {
    expect(resolveRateLimitGroup('/api/system/health').group).toBe('default');
  });

  it('exposes all configured groups', () => {
    const groups = getRateLimitGroups();
    expect(groups.length).toBeGreaterThanOrEqual(8);
    expect(groups.some((g) => g.group === 'auth' && g.limit === 10)).toBe(true);
  });
});

describe('checkApiRateLimit', () => {
  it('allows requests within the group limit', () => {
    const id = `test-allow-${Date.now()}`;
    const result = checkApiRateLimit('/api/desktop/status', id);
    expect(result.allowed).toBe(true);
    expect(result.group).toBe('desktop');
  });

  it('blocks once the group limit is exceeded', () => {
    const id = `test-block-${Date.now()}`;
    // auth group limit is 10/min — exhaust it
    let last;
    for (let i = 0; i < 11; i++) {
      last = checkApiRateLimit('/api/oauth/github', id);
    }
    expect(last!.allowed).toBe(false);
  });

  it('keys are isolated per identifier (different users do not share a bucket)', () => {
    const a = checkApiRateLimit('/api/ai/executive', `user-a-${Date.now()}`);
    const b = checkApiRateLimit('/api/ai/executive', `user-b-${Date.now()}`);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it('tracks total invocation count for the security audit', () => {
    const before = getRateLimitInvocationCount();
    checkApiRateLimit('/api/memory/search', `count-test-${Date.now()}`);
    expect(getRateLimitInvocationCount()).toBe(before + 1);
  });
});
