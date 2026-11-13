import { describe, it, expect } from 'vitest';
import { getErrorRegistry } from '../src/lib/observability/error-registry';
import { classifyError } from '../src/lib/observability/error-boundary';

describe('ErrorRegistry', () => {
  it('records errors by classification', () => {
    const registry = getErrorRegistry();
    const before = registry.getTotal();
    registry.record('workflow', 'test workflow failure');
    expect(registry.getTotal()).toBe(before + 1);
  });

  it('aggregates count per classification', () => {
    const registry = getErrorRegistry();
    const entryBefore = registry.getAll().find((e) => e.classification === 'ai')?.count ?? 0;
    registry.record('ai', 'AI provider timeout');
    registry.record('ai', 'AI provider timeout again');
    const entry = registry.getAll().find((e) => e.classification === 'ai');
    expect(entry?.count).toBe(entryBefore + 2);
  });

  it('tracks lastMessage and lastOccurredAt', () => {
    const registry = getErrorRegistry();
    registry.record('desktop', 'Desktop agent unreachable');
    const entry = registry.getAll().find((e) => e.classification === 'desktop');
    expect(entry?.lastMessage).toContain('Desktop agent');
    expect(entry?.lastOccurredAt).toBeTruthy();
  });

  it('sorts entries by count descending', () => {
    const registry = getErrorRegistry();
    registry.reset();
    registry.record('validation', 'x');
    registry.record('database', 'y');
    registry.record('database', 'z');
    const all = registry.getAll();
    expect(all[0]!.classification).toBe('database');
    expect(all[0]!.count).toBe(2);
  });
});

describe('classifyError — new classes', () => {
  it('classifies authorization errors distinct from authentication', () => {
    const result = classifyError(new Error('permission denied for this resource'));
    expect(result.classification).toBe('authorization');
  });

  it('classifies workflow errors', () => {
    const result = classifyError(new Error('workflow execution failed at step 3'));
    expect(result.classification).toBe('workflow');
  });

  it('classifies AI errors', () => {
    const result = classifyError(new Error('AI provider returned an invalid response'));
    expect(result.classification).toBe('ai');
  });

  it('classifies desktop errors', () => {
    const result = classifyError(new Error('desktop agent connection refused'));
    expect(result.classification).toBe('desktop');
  });

  it('classifies integration errors', () => {
    const result = classifyError(new Error('integration hub sync failed'));
    expect(result.classification).toBe('integration');
  });

  it('preserves original 6 classifications for the same inputs (no regression)', () => {
    expect(classifyError(new Error('JWT expired, unauthorized')).classification).toBe('auth');
    expect(classifyError(new Error('Resource not found')).classification).toBe('not_found');
    expect(
      classifyError(new Error('duplicate key value violates unique constraint')).classification,
    ).toBe('validation');
    expect(
      classifyError(new Error('relation "foo" does not exist in postgres')).classification,
    ).toBe('database');
    expect(classifyError(new Error('fetch failed: ECONNREFUSED')).classification).toBe('external');
    expect(classifyError(new Error('something weird happened')).classification).toBe('internal');
  });
});
