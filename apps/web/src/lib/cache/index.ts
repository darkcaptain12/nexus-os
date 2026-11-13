interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Generic in-memory TTL cache. Applied at the API route boundary (not inside
 * module business logic) so caching the response of, say, the AI Executive
 * summary or Memory Health report never changes those modules' own code —
 * only how often their (unmodified) functions get re-invoked per request.
 */
export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }
}

let sharedCache: TTLCache | null = null;

export function getCache(): TTLCache {
  if (!sharedCache) sharedCache = new TTLCache();
  return sharedCache;
}

/** Wraps an async producer with cache-aside semantics. */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<T> {
  const cache = getCache() as TTLCache<T>;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const value = await produce();
  cache.set(key, value, ttlMs);
  return value;
}
