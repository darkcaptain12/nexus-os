export type StateScope = 'application' | 'runtime' | 'session' | 'module' | 'agent' | 'workflow';

export interface StateEntry<T = unknown> {
  key: string;
  value: T;
  scope: StateScope;
  version: number;
  updatedAt: string;
  expiresAt?: string;
}

export interface StateSnapshot {
  id: string;
  scope: StateScope;
  entries: Record<string, unknown>;
  createdAt: string;
  description?: string;
}

export interface StateChange<T = unknown> {
  key: string;
  previousValue: T | undefined;
  newValue: T;
  scope: StateScope;
  timestamp: string;
}

export interface StateQuery {
  scope?: StateScope;
  prefix?: string;
  pattern?: string;
}
