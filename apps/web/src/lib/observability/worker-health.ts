export type WorkerRunStatus = 'success' | 'failure';

export interface WorkerRunReport {
  workerName: string;
  status: WorkerRunStatus;
  durationMs: number;
  error?: string;
}

export interface WorkerHealth {
  name: string;
  hasData: boolean;
  lastRunAt: string | null;
  lastStatus: WorkerRunStatus | null;
  totalRuns: number;
  successRate: number | null;
  failureCount: number;
  consecutiveFailures: number;
  queueLength: number | null;
}

const KNOWN_WORKERS = [
  'notification-worker',
  'memory-worker',
  'automation-worker',
  'ai-worker',
  'crawler-worker',
  'scheduler',
];

interface WorkerState {
  runs: { status: WorkerRunStatus; at: string; durationMs: number }[];
  consecutiveFailures: number;
  queueLength: number | null;
}

/**
 * Real registry — workers call reportRun()/reportQueueLength() to push their
 * own status. As of this sprint no worker process actually calls in (the
 * workers/* packages are type-only scaffolding, not running services), so
 * every registered name reports hasData:false rather than a fabricated
 * success rate.
 */
class WorkerHealthRegistry {
  private workers = new Map<string, WorkerState>();

  constructor() {
    for (const name of KNOWN_WORKERS) {
      this.workers.set(name, { runs: [], consecutiveFailures: 0, queueLength: null });
    }
  }

  reportRun(report: WorkerRunReport): void {
    const state = this.workers.get(report.workerName) ?? {
      runs: [],
      consecutiveFailures: 0,
      queueLength: null,
    };
    state.runs.push({
      status: report.status,
      at: new Date().toISOString(),
      durationMs: report.durationMs,
    });
    if (state.runs.length > 200) state.runs = state.runs.slice(-100);
    state.consecutiveFailures = report.status === 'failure' ? state.consecutiveFailures + 1 : 0;
    this.workers.set(report.workerName, state);
  }

  reportQueueLength(workerName: string, length: number): void {
    const state = this.workers.get(workerName) ?? {
      runs: [],
      consecutiveFailures: 0,
      queueLength: null,
    };
    state.queueLength = length;
    this.workers.set(workerName, state);
  }

  getWorkerHealth(name: string): WorkerHealth {
    const state = this.workers.get(name);
    if (!state || state.runs.length === 0) {
      return {
        name,
        hasData: false,
        lastRunAt: null,
        lastStatus: null,
        totalRuns: 0,
        successRate: null,
        failureCount: 0,
        consecutiveFailures: 0,
        queueLength: state?.queueLength ?? null,
      };
    }

    const successes = state.runs.filter((r) => r.status === 'success').length;
    const last = state.runs[state.runs.length - 1]!;

    return {
      name,
      hasData: true,
      lastRunAt: last.at,
      lastStatus: last.status,
      totalRuns: state.runs.length,
      successRate: Math.round((successes / state.runs.length) * 100),
      failureCount: state.runs.length - successes,
      consecutiveFailures: state.consecutiveFailures,
      queueLength: state.queueLength,
    };
  }

  getAllWorkerHealth(): WorkerHealth[] {
    return [...this.workers.keys()].map((name) => this.getWorkerHealth(name));
  }
}

let instance: WorkerHealthRegistry | null = null;

export function getWorkerHealthRegistry(): WorkerHealthRegistry {
  if (!instance) instance = new WorkerHealthRegistry();
  return instance;
}
