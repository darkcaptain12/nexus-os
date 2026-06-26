import type { StateScope, StateEntry, StateSnapshot, StateChange, StateQuery } from './types';

export interface StateManager {
  get<T>(key: string, scope?: StateScope): T | undefined;
  set<T>(key: string, value: T, scope?: StateScope): void;
  delete(key: string, scope?: StateScope): void;
  has(key: string, scope?: StateScope): boolean;
  list(query?: StateQuery): StateEntry[];
  snapshot(scope?: StateScope, description?: string): StateSnapshot;
  restore(snapshot: StateSnapshot): void;
  onChange<T>(key: string, handler: (change: StateChange<T>) => void): () => void;
  clear(scope?: StateScope): void;
}

export interface ImmutableSnapshot {
  create(state: Record<string, unknown>): StateSnapshot;
  diff(a: StateSnapshot, b: StateSnapshot): StateDiff;
  merge(base: StateSnapshot, changes: StateSnapshot): StateSnapshot;
}

export interface StateDiff {
  added: Record<string, unknown>;
  removed: string[];
  modified: Record<string, { from: unknown; to: unknown }>;
}
