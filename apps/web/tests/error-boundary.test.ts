import { describe, it, expect } from 'vitest';
import { classifyError } from '../src/lib/observability/error-boundary';

describe('classifyError', () => {
  it('classifies auth errors', () => {
    const result = classifyError(new Error('JWT expired, unauthorized'));
    expect(result.classification).toBe('auth');
    expect(result.code).toBe('AUTH_ERROR');
  });

  it('classifies not_found errors', () => {
    const result = classifyError(new Error('Resource not found'));
    expect(result.classification).toBe('not_found');
  });

  it('classifies validation errors', () => {
    const result = classifyError(new Error('duplicate key value violates unique constraint'));
    expect(result.classification).toBe('validation');
  });

  it('classifies database errors', () => {
    const result = classifyError(new Error('relation "foo" does not exist in postgres'));
    expect(result.classification).toBe('database');
  });

  it('classifies external errors', () => {
    const result = classifyError(new Error('fetch failed: ECONNREFUSED'));
    expect(result.classification).toBe('external');
  });

  it('defaults to internal for unknown errors', () => {
    const result = classifyError(new Error('something weird happened'));
    expect(result.classification).toBe('internal');
  });

  it('handles non-Error throws', () => {
    const result = classifyError('a plain string throw');
    expect(result.classification).toBe('internal');
  });

  it('always produces a requestId', () => {
    const result = classifyError(new Error('x'));
    expect(result.requestId).toBeTruthy();
  });

  it('uses provided requestId when given', () => {
    const result = classifyError(new Error('x'), 'req-123');
    expect(result.requestId).toBe('req-123');
  });

  it('produces a user-friendly Turkish message', () => {
    const result = classifyError(new Error('JWT expired'));
    expect(result.userMessage.length).toBeGreaterThan(0);
    expect(result.userMessage).not.toContain('JWT');
  });

  it('internal errors have fatal severity and non-retryable', () => {
    const result = classifyError(new Error('something weird'));
    expect(result.severity).toBe('fatal');
    expect(result.retryable).toBe(false);
  });

  it('database errors are retryable with error severity', () => {
    const result = classifyError(new Error('supabase query failed'));
    expect(result.severity).toBe('error');
    expect(result.retryable).toBe(true);
  });

  it('validation errors are non-retryable with warning severity', () => {
    const result = classifyError(new Error('duplicate key violates constraint'));
    expect(result.severity).toBe('warning');
    expect(result.retryable).toBe(false);
  });
});
