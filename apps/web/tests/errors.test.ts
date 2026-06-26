import { describe, it, expect } from 'vitest';
import { NexusError, isRetryable, toNexusError } from '../src/lib/errors';

describe('NexusError', () => {
  it('creates with required fields', () => {
    const err = new NexusError({ code: 'AUTH_FAILED', message: 'Invalid token', userMessage: 'Oturum süresi doldu' });
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.userMessage).toBe('Oturum süresi doldu');
    expect(err.severity).toBe('error');
    expect(err.retryable).toBe(false);
  });

  it('serializes to safe JSON', () => {
    const err = new NexusError({ code: 'DB_ERROR', message: 'pg: connection refused', userMessage: 'Veritabanı hatası' });
    const json = err.toJSON();
    expect(json.message).toBe('Veritabanı hatası');
    expect(json.code).toBe('DB_ERROR');
    expect(json).not.toHaveProperty('stack');
  });

  it('retryable flag works', () => {
    const err = new NexusError({ code: 'TIMEOUT', message: 'timeout', userMessage: 'Zaman aşımı', retryable: true });
    expect(err.retryable).toBe(true);
    expect(isRetryable(err)).toBe(true);
  });
});

describe('isRetryable', () => {
  it('detects timeout errors', () => {
    expect(isRetryable(new Error('Connection timeout'))).toBe(true);
  });

  it('detects rate limit', () => {
    expect(isRetryable(new Error('rate limit exceeded'))).toBe(true);
  });

  it('non-retryable by default', () => {
    expect(isRetryable(new Error('Invalid input'))).toBe(false);
  });
});

describe('toNexusError', () => {
  it('wraps plain Error', () => {
    const nexus = toNexusError(new Error('test'));
    expect(nexus).toBeInstanceOf(NexusError);
    expect(nexus.code).toBe('UNKNOWN_ERROR');
  });

  it('passes through NexusError', () => {
    const original = new NexusError({ code: 'X', message: 'x', userMessage: 'x' });
    expect(toNexusError(original)).toBe(original);
  });

  it('wraps string', () => {
    const nexus = toNexusError('something broke');
    expect(nexus.message).toBe('something broke');
  });
});
