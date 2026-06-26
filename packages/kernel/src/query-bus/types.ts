export interface Query<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  metadata: QueryMetadata;
}

export interface QueryMetadata {
  correlationId: string;
  userId?: string;
  timestamp: string;
  timeout: number;
  cache: CachePolicy;
}

export interface CachePolicy {
  enabled: boolean;
  ttl: number;
  key?: string;
  invalidateOn?: string[];
}

export interface QueryResult<T = unknown> {
  queryId: string;
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  fromCache: boolean;
  durationMs: number;
  timestamp: string;
}

export interface ReadModel<T = unknown> {
  id: string;
  type: string;
  data: T;
  version: number;
  updatedAt: string;
}

export interface Projection {
  name: string;
  sourceEvents: string[];
  targetReadModel: string;
  version: number;
}

export type QueryMiddleware = (
  query: Query,
  next: () => Promise<QueryResult>,
) => Promise<QueryResult>;
