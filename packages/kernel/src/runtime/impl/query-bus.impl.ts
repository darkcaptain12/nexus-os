import type { Query, QueryResult, QueryMiddleware } from '../../query-bus/types';
import type { QueryBus, QueryHandler, QueryCache } from '../../query-bus/interfaces';
import type { Logger } from '@apex-os/logger';

class InMemoryCache implements QueryCache {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private hits = 0;
  private misses = 0;

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return { hits: this.hits, misses: this.misses, size: this.cache.size };
  }
}

export class InMemoryQueryBus implements QueryBus {
  private handlers = new Map<string, QueryHandler>();
  private middlewares: QueryMiddleware[] = [];
  private cache: InMemoryCache;
  private metrics = { queried: 0, succeeded: 0, failed: 0, cacheHits: 0 };
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
    this.cache = new InMemoryCache();
  }

  async query<TPayload, TResult>(query: Query<TPayload>): Promise<QueryResult<TResult>> {
    this.metrics.queried++;
    const start = performance.now();

    if (query.metadata.cache.enabled) {
      const cacheKey = query.metadata.cache.key ?? `${query.type}:${JSON.stringify(query.payload)}`;
      const cached = this.cache.get<TResult>(cacheKey);
      if (cached !== undefined) {
        this.metrics.cacheHits++;
        return {
          queryId: query.id,
          success: true,
          data: cached,
          fromCache: true,
          durationMs: performance.now() - start,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const handler = this.handlers.get(query.type);
    if (!handler) {
      this.metrics.failed++;
      return {
        queryId: query.id,
        success: false,
        error: { code: 'HANDLER_NOT_FOUND', message: `No handler for query: ${query.type}` },
        fromCache: false,
        durationMs: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    }

    const executeHandler = async (): Promise<QueryResult<TResult>> => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), query.metadata.timeout),
      );
      const data = await Promise.race([handler.handle(query), timeoutPromise]) as TResult;

      if (query.metadata.cache.enabled) {
        const cacheKey = query.metadata.cache.key ?? `${query.type}:${JSON.stringify(query.payload)}`;
        this.cache.set(cacheKey, data, query.metadata.cache.ttl);
      }

      return {
        queryId: query.id,
        success: true,
        data,
        fromCache: false,
        durationMs: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    };

    let pipeline: () => Promise<QueryResult<TResult>> = executeHandler;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i]!;
      const next = pipeline;
      pipeline = () => mw(query, next as () => Promise<QueryResult>) as Promise<QueryResult<TResult>>;
    }

    try {
      const result = await pipeline();
      this.metrics.succeeded++;
      return result;
    } catch (err) {
      this.metrics.failed++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.log.error(`Query failed: ${query.type}`, { queryId: query.id, error: errorMessage });
      return {
        queryId: query.id,
        success: false,
        error: { code: 'QUERY_FAILED', message: errorMessage },
        fromCache: false,
        durationMs: performance.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  registerHandler<TPayload, TResult>(queryType: string, handler: QueryHandler<TPayload, TResult>): void {
    this.handlers.set(queryType, handler as QueryHandler);
    this.log.debug(`Query handler registered: ${queryType}`);
  }

  unregisterHandler(queryType: string): void {
    this.handlers.delete(queryType);
  }

  use(middleware: QueryMiddleware): void {
    this.middlewares.push(middleware);
  }

  invalidateCache(key: string): void {
    this.cache.invalidate(key);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getMetrics() {
    return { ...this.metrics, handlerCount: this.handlers.size, cache: this.cache.getStats() };
  }
}
