import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TaskRepository } from '../src/lib/repositories/task.repository';
import { ProjectRepository } from '../src/lib/repositories/project.repository';
import { UserRepository } from '../src/lib/repositories/user.repository';
import { getQueryAuditor } from '../src/lib/repositories/query-audit';

/**
 * Any chained call resolves to `value` when awaited — proves the
 * instrumentation wrapper actually fires for real repository methods
 * without needing a live Supabase connection (none exists in this sandbox).
 */
function makeFakeSupabaseClient(value: unknown): SupabaseClient {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(value);
      }
      return () => proxy;
    },
  };
  const proxy: object = new Proxy({}, handler);
  return { from: () => proxy } as unknown as SupabaseClient;
}

describe('Repository instrumentation coverage', () => {
  it('TaskRepository.findOverdue records a query-audit entry for "tasks"', async () => {
    const db = makeFakeSupabaseClient({ data: [], error: null });
    const repo = new TaskRepository(db);
    const before =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'tasks')?.queryCount ?? 0;

    await repo.findOverdue();

    const after =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'tasks')?.queryCount ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('TaskRepository.findFiltered (custom, non-CRUD method) is instrumented too', async () => {
    const db = makeFakeSupabaseClient({ data: [], error: null, count: 0 });
    const repo = new TaskRepository(db);
    const before =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'tasks')?.queryCount ?? 0;

    await repo.findFiltered({});

    const after =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'tasks')?.queryCount ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('ProjectRepository.getProgress (custom method touching a different table) is instrumented', async () => {
    const db = makeFakeSupabaseClient({ data: [], error: null });
    const repo = new ProjectRepository(db);
    const before =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'projects')?.queryCount ?? 0;

    await repo.getProgress('proj-1');

    const after =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'projects')?.queryCount ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('UserRepository (does not extend BaseRepository) is still instrumented', async () => {
    const db = makeFakeSupabaseClient({ data: null, error: null });
    const repo = new UserRepository(db);
    const before =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'users')?.queryCount ?? 0;

    await repo.findByAuthId('auth-1');

    const after =
      getQueryAuditor()
        .getHeatmap()
        .find((h) => h.table === 'users')?.queryCount ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('slow operations (>200ms) are flagged in the slow-query log', async () => {
    const db: SupabaseClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                limit: async () => {
                  await new Promise((r) => setTimeout(r, 210));
                  return { data: [], error: null };
                },
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repo = new TaskRepository(db);
    await repo.findByStatus('pending');

    const slow = getQueryAuditor().getSlowQueries();
    expect(slow.some((q) => q.table === 'tasks' && q.operation === 'findByStatus')).toBe(true);
  });
});
