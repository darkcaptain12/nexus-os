import type { AgentSchedulerMetrics } from './types';

const MAX_CONCURRENT = 3;
const RETRY_DELAY_MS = 5000;

class AgentScheduler {
  private queue: { agentId: string; priority: number; enqueuedAt: number }[] = [];
  private running: Set<string> = new Set();
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalRetried: 0,
    runtimesMs: [] as number[],
  };

  enqueue(agentId: string, priority: 1 | 2 | 3 | 4 | 5 = 3): void {
    if (this.running.has(agentId)) return;
    const exists = this.queue.findIndex((q) => q.agentId === agentId);
    if (exists !== -1) return;
    this.queue.push({ agentId, priority, enqueuedAt: Date.now() });
    this.queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
  }

  dequeue(): string | null {
    if (!this.canRun()) return null;
    const next = this.queue.shift();
    return next ? next.agentId : null;
  }

  markRunning(agentId: string): void {
    this.running.add(agentId);
  }

  markDone(agentId: string, runtimeMs = 0): void {
    this.running.delete(agentId);
    this.stats.totalProcessed++;
    if (runtimeMs > 0) {
      this.stats.runtimesMs.push(runtimeMs);
      if (this.stats.runtimesMs.length > 100) this.stats.runtimesMs.shift();
    }
  }

  markFailed(agentId: string): void {
    this.running.delete(agentId);
    this.stats.totalFailed++;
  }

  scheduleRetry(agentId: string, priority: 1 | 2 | 3 | 4 | 5 = 3, delayMs = RETRY_DELAY_MS): void {
    if (this.retryTimers.has(agentId)) return;
    this.stats.totalRetried++;
    const timer = setTimeout(() => {
      this.retryTimers.delete(agentId);
      this.enqueue(agentId, priority);
    }, delayMs);
    this.retryTimers.set(agentId, timer);
  }

  canRun(): boolean {
    return this.running.size < MAX_CONCURRENT && this.queue.length > 0;
  }

  remove(agentId: string): void {
    this.queue = this.queue.filter((q) => q.agentId !== agentId);
    this.running.delete(agentId);
    const timer = this.retryTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(agentId);
    }
  }

  getMetrics(): AgentSchedulerMetrics {
    const avg =
      this.stats.runtimesMs.length === 0
        ? 0
        : Math.round(
            this.stats.runtimesMs.reduce((s, v) => s + v, 0) / this.stats.runtimesMs.length,
          );
    return {
      queueLength: this.queue.length,
      runningCount: this.running.size,
      maxConcurrent: MAX_CONCURRENT,
      totalProcessed: this.stats.totalProcessed,
      totalFailed: this.stats.totalFailed,
      totalRetried: this.stats.totalRetried,
      averageRuntimeMs: avg,
      generatedAt: new Date().toISOString(),
    };
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexAgentScheduler?: AgentScheduler };

export function getAgentScheduler(): AgentScheduler {
  if (!g.__apexAgentScheduler) g.__apexAgentScheduler = new AgentScheduler();
  return g.__apexAgentScheduler;
}

export { AgentScheduler, RETRY_DELAY_MS };
