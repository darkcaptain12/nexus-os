import type { Query, QueryResult, QueryMiddleware, ReadModel, Projection } from './types';

export interface QueryBus {
  query<TPayload, TResult>(query: Query<TPayload>): Promise<QueryResult<TResult>>;
  registerHandler<TPayload, TResult>(
    queryType: string,
    handler: QueryHandler<TPayload, TResult>,
  ): void;
  unregisterHandler(queryType: string): void;
  use(middleware: QueryMiddleware): void;
  invalidateCache(key: string): void;
  clearCache(): void;
}

export interface QueryHandler<TPayload = unknown, TResult = unknown> {
  handle(query: Query<TPayload>): Promise<TResult>;
}

export interface QueryCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl: number): void;
  invalidate(key: string): void;
  invalidatePattern(pattern: string): void;
  clear(): void;
  getStats(): { hits: number; misses: number; size: number };
}

export interface ProjectionManager {
  register(projection: Projection): void;
  rebuild(projectionName: string): Promise<void>;
  getReadModel<T>(type: string, id: string): Promise<ReadModel<T> | null>;
  listReadModels(type: string): Promise<ReadModel[]>;
}
