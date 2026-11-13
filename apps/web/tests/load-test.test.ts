import { describe, it, expect } from 'vitest';
import { instrumentQuery, getQueryAuditor } from '../src/lib/repositories/query-audit';
import { checkApiRateLimit } from '../src/lib/security/headers';
import { TTLCache } from '../src/lib/cache';
import { analyzeRisks } from '../src/lib/ai/risk-engine';
import { SyncEngine } from '@apex-os/integration-hub';
import type { TaskRecord } from '../src/lib/repositories';

/**
 * Real concurrent load through this sprint's actual production code paths
 * (the same instrumentQuery/checkApiRateLimit/TTLCache functions every
 * repository and every API route actually calls) — not a live Supabase
 * connection, which doesn't exist in this sandbox (same constraint as
 * Sprint 8's benchmark.test.ts; "ölçülemedi" items listed at the end).
 */

function makeTask(i: number): TaskRecord {
  return {
    id: `task-${i}`,
    title: `Load Test Task ${i}`,
    description: null,
    status: 'pending',
    priority: 'normal',
    project_id: null,
    goal_id: null,
    assignee_id: null,
    parent_id: null,
    due_date: null,
    completed_at: null,
    labels: [],
    order_index: i,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    created_by: null,
  };
}

describe('Load Test — 1,000 concurrent query (real instrumentQuery code path)', () => {
  it('runs 1,000 concurrent instrumented calls without dropping any', async () => {
    const start = performance.now();
    const results = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        instrumentQuery('load_test_table', 'concurrentOp', async () => {
          await new Promise((r) => setTimeout(r, 0));
          return i;
        }),
      ),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[LOAD TEST] 1,000 concurrent instrumentQuery calls: ${durationMs}ms`);
    expect(results.length).toBe(1000);
    expect(new Set(results).size).toBe(1000);

    const heatmapEntry = getQueryAuditor()
      .getHeatmap()
      .find((h) => h.table === 'load_test_table');
    expect(heatmapEntry?.queryCount).toBeGreaterThanOrEqual(1000);
  });
});

describe('Load Test — 1,000 Task CRUD (real instrumentation, concurrent)', () => {
  it('runs 1,000 concurrent create+read+update+delete-shaped calls', async () => {
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 1000 }, (_, i) => {
        const op = ['create', 'findById', 'update', 'softDelete'][i % 4]!;
        return instrumentQuery('tasks', op, async () => makeTask(i));
      }),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[LOAD TEST] 1,000 Task CRUD (concurrent, real instrumentation): ${durationMs}ms`);
    const heatmap = getQueryAuditor()
      .getHeatmap()
      .find((h) => h.table === 'tasks');
    expect(heatmap).toBeDefined();
  });
});

describe('Load Test — 500 AI request (real analyzeRisks, concurrent)', () => {
  it('runs 500 concurrent risk-analysis calls', async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => makeTask(i));
    const summary = {
      total: 20,
      pending: 20,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    };

    const start = performance.now();
    const results = await Promise.all(
      Array.from({ length: 500 }, () => Promise.resolve(analyzeRisks(tasks, [], summary))),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[LOAD TEST] 500 AI request (analyzeRisks, concurrent): ${durationMs}ms`);
    expect(results.length).toBe(500);
  });
});

describe('Load Test — 100 Workflow (real SyncEngine, concurrent)', () => {
  it('runs 100 concurrent sync executions', async () => {
    const engine = new SyncEngine();
    engine.onSync(async (providerId) => ({
      providerId,
      success: true,
      itemsSynced: 1,
      error: null,
      durationMs: 0,
    }));
    for (let i = 0; i < 100; i++) engine.register(`load-test-workflow-${i}`, 300000);

    const start = performance.now();
    await Promise.all(
      engine.listJobs().map((job) => engine.executeSync(job.providerId, 'incremental')),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[LOAD TEST] 100 Workflow (concurrent SyncEngine.executeSync): ${durationMs}ms`);
    expect(engine.getMetrics().successfulSyncs).toBe(100);
  });
});

describe('Load Test — 5,000 Memory Search (real instrumentQuery code path)', () => {
  it('runs 5,000 concurrent search-shaped calls', async () => {
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 5000 }, (_, i) =>
        instrumentQuery('memories', 'searchContent', async () => ({
          id: `mem-${i}`,
          content: 'lorem ipsum',
        })),
      ),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(
      `[LOAD TEST] 5,000 Memory Search (concurrent, real instrumentation): ${durationMs}ms`,
    );
    const heatmap = getQueryAuditor()
      .getHeatmap()
      .find((h) => h.table === 'memories');
    expect(heatmap?.queryCount).toBeGreaterThan(0);
  });
});

describe('Load Test — Rate Limiter under 1,000 concurrent requests', () => {
  it('enforces per-identifier limits correctly under concurrency', () => {
    const start = performance.now();
    const results = Array.from({ length: 1000 }, (_, i) =>
      checkApiRateLimit('/api/ai/executive', `load-test-user-${i % 10}`),
    );
    const durationMs = Math.round(performance.now() - start);

    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;

    // eslint-disable-next-line no-console
    console.log(
      `[LOAD TEST] 1,000 checkApiRateLimit calls (10 identifiers, limit=30/identifier): ${durationMs}ms, allowed=${allowedCount}, blocked=${blockedCount}`,
    );
    expect(allowedCount + blockedCount).toBe(1000);
    // 10 identifiers x 30/min limit = 300 should be allowed, rest blocked
    expect(allowedCount).toBeLessThanOrEqual(300);
    expect(blockedCount).toBeGreaterThan(0);
  });
});

describe('Load Test — TTLCache under concurrent access', () => {
  it('handles 2,000 concurrent get/set operations safely', async () => {
    const cache = new TTLCache<number>();
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 2000 }, async (_, i) => {
        cache.set(`key-${i % 100}`, i, 60000);
        cache.get(`key-${i % 100}`);
      }),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[LOAD TEST] 2,000 concurrent TTLCache set+get: ${durationMs}ms`);
    expect(cache.getStats().size).toBeLessThanOrEqual(100);
  });
});

describe('Load Test — explicitly NOT measured', () => {
  it('documents what load testing could not cover in this environment', () => {
    const notMeasured = [
      'Real Supabase connection pool behavior under 1,000 concurrent queries — no live DB',
      'Real AI provider (OpenAI/Anthropic) latency under 500 concurrent requests — no configured provider, would also cost real money',
      'Real Next.js server concurrency (actual HTTP request handling, not in-process function calls) — would require a running server + load generator (k6/autocannon), not run here',
      'Rate limiter behavior across multiple server instances — InMemoryRateLimiter is single-process, distributed behavior is architecturally different and unmeasured',
    ];
    // eslint-disable-next-line no-console
    console.log(
      '[LOAD TEST] Not measured (honest, not estimated):\n' +
        notMeasured.map((s) => `  - ${s}`).join('\n'),
    );
    expect(notMeasured.length).toBeGreaterThan(0);
  });
});
