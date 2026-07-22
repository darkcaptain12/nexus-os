import { describe, it, expect } from 'vitest';
import { TTLCache } from '../src/lib/cache';
import { getMetrics } from '../src/lib/observability';
import { analyzeRisks } from '../src/lib/ai/risk-engine';
import { calculateProductivity } from '../src/lib/ai/productivity';
import { SyncEngine } from '@apex-os/integration-hub';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '../src/lib/repositories';

/**
 * Real, in-process measurements only — no live Supabase connection exists
 * in this sandbox, so DB round-trip timings for Task/Project/Memory inserts
 * cannot be measured and are NOT estimated here. Each it() logs the actual
 * wall-clock time obtained on this run; see the sprint report for the
 * numbers pulled from this test's console output.
 */

function makeTask(i: number): TaskRecord {
  return {
    id: `task-${i}`,
    title: `Benchmark Task ${i}`,
    description: 'x'.repeat(120),
    status: i % 4 === 0 ? 'completed' : 'pending',
    priority: i % 5 === 0 ? 'high' : 'normal',
    project_id: `proj-${i % 50}`,
    goal_id: null,
    assignee_id: null,
    parent_id: null,
    due_date: i % 3 === 0 ? new Date(Date.now() - 86400000).toISOString() : null,
    completed_at: null,
    labels: ['bench'],
    order_index: i,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    created_by: null,
  };
}

function makeProject(i: number): { project: ProjectRecord; progress: ProjectProgress } {
  return {
    project: {
      id: `proj-${i}`,
      name: `Benchmark Project ${i}`,
      description: null,
      status: 'active',
      priority: 'normal',
      goal_id: null,
      owner_id: 'bench-user',
      color: '#3b82f6',
      icon: null,
      start_date: null,
      end_date: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      created_by: null,
    },
    progress: {
      totalTasks: 20,
      completedTasks: 10,
      pendingTasks: 8,
      inProgressTasks: 2,
      overdueTasks: 2,
      percent: 50,
    },
  };
}

describe('Benchmark — 1,000 Task (real, in-memory)', () => {
  it('constructs 1,000 TaskRecord objects and runs analyzeRisks() over them', () => {
    const start = performance.now();
    const tasks = Array.from({ length: 1000 }, (_, i) => makeTask(i));
    const constructMs = Math.round(performance.now() - start);

    const riskStart = performance.now();
    const risks = analyzeRisks(tasks, [], {
      total: 1000,
      pending: 750,
      inProgress: 0,
      completed: 250,
      overdue: 333,
      dueToday: 0,
      highPriority: 200,
    });
    const riskMs = Math.round(performance.now() - riskStart);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] 1,000 Task: construct=${constructMs}ms, analyzeRisks=${riskMs}ms, risksFound=${risks.length}`,
    );
    expect(tasks.length).toBe(1000);
    expect(constructMs).toBeLessThan(1000);
  });
});

describe('Benchmark — 500 Project (real, in-memory)', () => {
  it('constructs 500 Project+Progress pairs and runs calculateProductivity()', () => {
    const start = performance.now();
    const projects = Array.from({ length: 500 }, (_, i) => makeProject(i));
    const constructMs = Math.round(performance.now() - start);

    const calcStart = performance.now();
    const result = calculateProductivity(
      {
        total: 1000,
        pending: 400,
        inProgress: 300,
        completed: 300,
        overdue: 100,
        dueToday: 20,
        highPriority: 150,
      },
      projects.map((p) => p.progress),
    );
    const calcMs = Math.round(performance.now() - calcStart);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] 500 Project: construct=${constructMs}ms, calculateProductivity=${calcMs}ms, score=${result.score}`,
    );
    expect(projects.length).toBe(500);
  });
});

describe('Benchmark — 50,000 Memory (real, in-memory subset only)', () => {
  it('constructs 50,000 memory-shaped objects and aggregates by type (O(n))', () => {
    const start = performance.now();
    const memories = Array.from({ length: 50000 }, (_, i) => ({
      id: `mem-${i}`,
      type: ['note', 'decision', 'fact', 'idea'][i % 4]!,
      content: 'Lorem ipsum '.repeat(10),
      importance: Math.random(),
      tags: ['bench'],
      createdAt: new Date().toISOString(),
    }));
    const constructMs = Math.round(performance.now() - start);

    const aggStart = performance.now();
    const typeCounts = new Map<string, number>();
    for (const m of memories) typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
    const aggMs = Math.round(performance.now() - aggStart);

    // eslint-disable-next-line no-console
    console.log(`[BENCHMARK] 50,000 Memory: construct=${constructMs}ms, O(n)-aggregate=${aggMs}ms`);
    // eslint-disable-next-line no-console
    console.log(
      '[BENCHMARK] 50,000 Memory: O(n^2) duplicate-detection NOT run at this scale — ~1.25 billion comparisons, impractical for a single request. Real finding: duplicate detection needs a sub-O(n^2) approach (embeddings/LSH) before it can scale to 50k rows. Reported as "ölçülemedi" by design, not a missing measurement.',
    );
    expect(memories.length).toBe(50000);
  });
});

describe('Benchmark — 1,000 Workflow (real SyncEngine/job registration, in-memory)', () => {
  it('registers 1,000 sync jobs on a real SyncEngine instance', () => {
    const engine = new SyncEngine();
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      engine.register(`workflow-provider-${i}`, 300000);
    }
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] 1,000 Workflow (as SyncEngine.register calls): ${durationMs}ms, jobs=${engine.listJobs().length}`,
    );
    expect(engine.listJobs().length).toBe(1000);
  });
});

describe('Benchmark — 500 Integration Job (real, in-memory)', () => {
  it('runs 500 sync executions through a real SyncEngine with a no-op handler', async () => {
    const engine = new SyncEngine();
    engine.onSync(async (providerId) => ({
      providerId,
      success: true,
      itemsSynced: 1,
      error: null,
      durationMs: 0,
    }));
    for (let i = 0; i < 500; i++) engine.register(`integration-${i}`, 300000);

    const start = performance.now();
    await Promise.all(
      engine.listJobs().map((job) => engine.executeSync(job.providerId, 'incremental')),
    );
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] 500 Integration Job (real SyncEngine.executeSync, no-op handler): ${durationMs}ms`,
    );
    expect(engine.getMetrics().successfulSyncs).toBe(500);
  });
});

describe('Benchmark — TTLCache throughput (real)', () => {
  it('performs 50,000 set+get operations', () => {
    const cache = new TTLCache<number>();
    const start = performance.now();
    for (let i = 0; i < 50000; i++) {
      cache.set(`key-${i}`, i, 60000);
    }
    for (let i = 0; i < 50000; i++) {
      cache.get(`key-${i}`);
    }
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[BENCHMARK] TTLCache 50,000 set + 50,000 get: ${durationMs}ms`);
    expect(cache.getStats().hits).toBe(50000);
  });
});

describe('Benchmark — MetricsCollector throughput (real)', () => {
  it('records 100,000 metrics (auto-trims at 10,000)', () => {
    const m = getMetrics();
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      m.record('bench.metric', i % 1000, 'ms');
    }
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(`[BENCHMARK] MetricsCollector.record x100,000: ${durationMs}ms`);
    expect(durationMs).toBeLessThan(5000);
  });
});

describe('Benchmark — explicitly NOT measured', () => {
  it('documents what could not be measured in this environment', () => {
    const notMeasured = [
      'Supabase INSERT latency for 1,000 Task rows — no live DB connection in this sandbox',
      'Supabase INSERT latency for 500 Project rows — no live DB connection',
      'Supabase INSERT/vector-search latency for 50,000 Memory rows — no live DB connection',
      'RLS policy evaluation overhead at scale — requires live Postgres',
      'Network round-trip time to Supabase — requires live connection',
      'Desktop Agent real CPU/RAM under sustained multi-day load — requires a long-running GUI session, not available headless',
    ];
    // eslint-disable-next-line no-console
    console.log(
      '[BENCHMARK] Not measured (honest, not estimated):\n' +
        notMeasured.map((s) => `  - ${s}`).join('\n'),
    );
    expect(notMeasured.length).toBeGreaterThan(0);
  });
});
