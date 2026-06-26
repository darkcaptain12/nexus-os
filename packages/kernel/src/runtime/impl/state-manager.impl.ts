import type { StateScope, StateEntry, StateSnapshot, StateChange, StateQuery } from '../../state/types';
import type { StateManager } from '../../state/interfaces';

export class InMemoryStateManager implements StateManager {
  private state = new Map<string, StateEntry>();
  private changeHandlers = new Map<string, Array<(change: StateChange) => void>>();
  private versions = new Map<string, number>();

  get<T>(key: string, scope: StateScope = 'application'): T | undefined {
    const fullKey = `${scope}:${key}`;
    const entry = this.state.get(fullKey);
    if (!entry) return undefined;
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      this.state.delete(fullKey);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, scope: StateScope = 'application'): void {
    const fullKey = `${scope}:${key}`;
    const previous = this.state.get(fullKey);
    const version = (this.versions.get(fullKey) ?? 0) + 1;
    this.versions.set(fullKey, version);

    const entry: StateEntry<T> = {
      key,
      value,
      scope,
      version,
      updatedAt: new Date().toISOString(),
    };
    this.state.set(fullKey, entry as StateEntry);

    const change: StateChange<T> = {
      key,
      previousValue: previous?.value as T | undefined,
      newValue: value,
      scope,
      timestamp: new Date().toISOString(),
    };

    const handlers = this.changeHandlers.get(key);
    if (handlers) {
      for (const handler of handlers) {
        handler(change as StateChange);
      }
    }
  }

  delete(key: string, scope: StateScope = 'application'): void {
    this.state.delete(`${scope}:${key}`);
  }

  has(key: string, scope: StateScope = 'application'): boolean {
    return this.state.has(`${scope}:${key}`);
  }

  list(query?: StateQuery): StateEntry[] {
    let entries = [...this.state.values()];
    if (query?.scope) {
      entries = entries.filter((e) => e.scope === query.scope);
    }
    if (query?.prefix) {
      entries = entries.filter((e) => e.key.startsWith(query.prefix!));
    }
    if (query?.pattern) {
      const regex = new RegExp(query.pattern);
      entries = entries.filter((e) => regex.test(e.key));
    }
    return entries;
  }

  snapshot(scope?: StateScope, description?: string): StateSnapshot {
    const entries: Record<string, unknown> = {};
    for (const [key, entry] of this.state) {
      if (!scope || entry.scope === scope) {
        entries[key] = structuredClone(entry.value);
      }
    }
    return {
      id: crypto.randomUUID(),
      scope: scope ?? 'application',
      entries,
      createdAt: new Date().toISOString(),
      description,
    };
  }

  restore(snapshot: StateSnapshot): void {
    for (const [key, value] of Object.entries(snapshot.entries)) {
      const parts = key.split(':');
      const scope = parts[0] as StateScope;
      const actualKey = parts.slice(1).join(':');
      this.set(actualKey, value, scope);
    }
  }

  onChange<T>(key: string, handler: (change: StateChange<T>) => void): () => void {
    const handlers = this.changeHandlers.get(key) ?? [];
    handlers.push(handler as (change: StateChange) => void);
    this.changeHandlers.set(key, handlers);
    return () => {
      const list = this.changeHandlers.get(key);
      if (list) {
        const idx = list.indexOf(handler as (change: StateChange) => void);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  clear(scope?: StateScope): void {
    if (!scope) {
      this.state.clear();
      return;
    }
    for (const [key, entry] of this.state) {
      if (entry.scope === scope) {
        this.state.delete(key);
      }
    }
  }
}
