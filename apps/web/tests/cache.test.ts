import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TTLCache, withCache, getCache } from '../src/lib/cache';

describe('TTLCache', () => {
  let cache: TTLCache<string>;

  beforeEach(() => {
    cache = new TTLCache<string>();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1', 1000);
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 100);
    expect(cache.get('key1')).toBe('value1');
    vi.advanceTimersByTime(150);
    expect(cache.get('key1')).toBeUndefined();
    vi.useRealTimers();
  });

  it('has() reflects expiry', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value1', 100);
    expect(cache.has('key1')).toBe(true);
    vi.advanceTimersByTime(150);
    expect(cache.has('key1')).toBe(false);
    vi.useRealTimers();
  });

  it('invalidate removes a key', () => {
    cache.set('key1', 'value1', 10000);
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('clear resets everything including stats', () => {
    cache.set('key1', 'value1', 10000);
    cache.get('key1');
    cache.get('missing');
    cache.clear();
    expect(cache.getStats()).toEqual({ size: 0, hits: 0, misses: 0, hitRate: 0 });
    expect(cache.get('key1')).toBeUndefined();
  });

  it('tracks hit/miss stats', () => {
    cache.set('key1', 'value1', 10000);
    cache.get('key1');
    cache.get('key1');
    cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(67);
  });
});

describe('withCache', () => {
  afterEach(() => {
    getCache().clear();
  });

  it('calls producer once for repeated calls within TTL', async () => {
    let calls = 0;
    const produce = async () => {
      calls++;
      return 'result';
    };

    const r1 = await withCache('test.key', 10000, produce);
    const r2 = await withCache('test.key', 10000, produce);

    expect(r1).toBe('result');
    expect(r2).toBe('result');
    expect(calls).toBe(1);
  });

  it('calls producer again after expiry', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const produce = async () => {
      calls++;
      return `result-${calls}`;
    };

    const r1 = await withCache('test.expiry', 100, produce);
    vi.advanceTimersByTime(150);
    const r2 = await withCache('test.expiry', 100, produce);

    expect(r1).toBe('result-1');
    expect(r2).toBe('result-2');
    vi.useRealTimers();
  });
});
