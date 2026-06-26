import { describe, it, expect, beforeEach } from 'vitest';
import { CredentialManager } from '../src/credentials';
import { RateLimiter } from '../src/rate-limit';

describe('CredentialManager', () => {
  let manager: CredentialManager;

  beforeEach(() => {
    manager = new CredentialManager();
  });

  it('stores and retrieves credentials', () => {
    manager.set('github', { providerId: 'github', authMethod: 'bearer', accessToken: 'token123' });
    expect(manager.get('github')?.accessToken).toBe('token123');
  });

  it('checks existence', () => {
    expect(manager.has('github')).toBe(false);
    manager.set('github', { providerId: 'github', authMethod: 'bearer' });
    expect(manager.has('github')).toBe(true);
  });

  it('removes credentials', () => {
    manager.set('github', { providerId: 'github', authMethod: 'bearer' });
    manager.remove('github');
    expect(manager.has('github')).toBe(false);
  });

  it('detects expired tokens', () => {
    manager.set('expired', {
      providerId: 'expired',
      authMethod: 'oauth2',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(manager.isExpired('expired')).toBe(true);
  });

  it('updates token', () => {
    manager.set('github', { providerId: 'github', authMethod: 'bearer', accessToken: 'old' });
    manager.updateToken('github', 'new');
    expect(manager.get('github')?.accessToken).toBe('new');
  });

  it('lists providers', () => {
    manager.set('a', { providerId: 'a', authMethod: 'bearer' });
    manager.set('b', { providerId: 'b', authMethod: 'api-key' });
    expect(manager.listProviders()).toHaveLength(2);
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows consumption within limit', () => {
    limiter.configure('github', 5, 60000);
    expect(limiter.consume('github')).toBe(true);
    expect(limiter.getState('github')?.remaining).toBe(4);
  });

  it('blocks when limit reached', () => {
    limiter.configure('github', 2, 60000);
    limiter.consume('github');
    limiter.consume('github');
    expect(limiter.consume('github')).toBe(false);
    expect(limiter.isLimited('github')).toBe(true);
  });

  it('allows unconfigured provider', () => {
    expect(limiter.consume('unknown')).toBe(true);
    expect(limiter.isLimited('unknown')).toBe(false);
  });
});
