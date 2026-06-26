export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema?: string;
}

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string; code: string } | null;
  count?: number;
}

export interface TransactionClient {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseClient {
  from<T = unknown>(table: string): TableQuery<T>;
  rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<QueryResult<T>>;
  transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

export interface TableQuery<T> {
  select(columns?: string): TableQuery<T>;
  insert(data: Partial<T> | Partial<T>[]): Promise<QueryResult<T>>;
  update(data: Partial<T>): TableQuery<T>;
  delete(): TableQuery<T>;
  eq(column: string, value: unknown): TableQuery<T>;
  neq(column: string, value: unknown): TableQuery<T>;
  gt(column: string, value: unknown): TableQuery<T>;
  lt(column: string, value: unknown): TableQuery<T>;
  order(column: string, ascending?: boolean): TableQuery<T>;
  limit(count: number): TableQuery<T>;
  single(): Promise<QueryResult<T>>;
  execute(): Promise<QueryResult<T[]>>;
}
