import type { ExecutiveCycle, ExecutiveState, PipelineStage } from '../types';

const MAX_CYCLES = 100;

class CycleEngine {
  private cycles: ExecutiveCycle[] = [];
  private currentId: string | null = null;

  startCycle(id: string): ExecutiveCycle {
    const cycle: ExecutiveCycle = {
      id,
      startAt: new Date().toISOString(),
      state: 'COLLECTING_CONTEXT',
      decisionCount: 0,
      approvalCount: 0,
      executionCount: 0,
      failureCount: 0,
      confidenceAverage: 0,
      contextBuildMs: 0,
      pipelineMs: 0,
      stages: [],
    };
    this.cycles.push(cycle);
    if (this.cycles.length > MAX_CYCLES) {
      this.cycles.splice(0, this.cycles.length - MAX_CYCLES);
    }
    this.currentId = id;
    return cycle;
  }

  updateCycle(id: string, updates: Partial<ExecutiveCycle>): ExecutiveCycle | null {
    const cycle = this.cycles.find((c) => c.id === id);
    if (!cycle) return null;
    Object.assign(cycle, updates);
    return cycle;
  }

  completeCycle(
    id: string,
    metrics: {
      decisionCount: number;
      approvalCount: number;
      executionCount: number;
      failureCount: number;
      confidenceAverage: number;
      contextBuildMs: number;
      pipelineMs: number;
      stages: PipelineStage[];
      insight?: string;
      state: ExecutiveState;
    },
  ): ExecutiveCycle | null {
    const cycle = this.cycles.find((c) => c.id === id);
    if (!cycle) return null;
    const now = new Date().toISOString();
    cycle.finishAt = now;
    cycle.durationMs = new Date(now).getTime() - new Date(cycle.startAt).getTime();
    Object.assign(cycle, metrics);
    if (this.currentId === id) this.currentId = null;
    return cycle;
  }

  failCycle(id: string, reason: string): void {
    const cycle = this.cycles.find((c) => c.id === id);
    if (!cycle) return;
    cycle.state = 'FAILED';
    cycle.finishAt = new Date().toISOString();
    cycle.insight = `FAILED: ${reason}`;
    cycle.failureCount = (cycle.failureCount ?? 0) + 1;
    if (this.currentId === id) this.currentId = null;
  }

  getCurrent(): ExecutiveCycle | null {
    if (!this.currentId) return null;
    return this.cycles.find((c) => c.id === this.currentId) ?? null;
  }

  getAll(limit = 50): ExecutiveCycle[] {
    return this.cycles.slice(-limit).reverse();
  }

  getAverageMetrics(): {
    avgDurationMs: number;
    avgConfidence: number;
    avgDecisions: number;
    totalCycles: number;
  } {
    const completed = this.cycles.filter((c) => c.finishAt);
    if (completed.length === 0)
      return { avgDurationMs: 0, avgConfidence: 0, avgDecisions: 0, totalCycles: 0 };
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    return {
      avgDurationMs: Math.round(avg(completed.map((c) => c.durationMs ?? 0))),
      avgConfidence: Math.round(avg(completed.map((c) => c.confidenceAverage))),
      avgDecisions: Math.round(avg(completed.map((c) => c.decisionCount))),
      totalCycles: this.cycles.length,
    };
  }
}

let _instance: CycleEngine | null = null;

export function getCycleEngine(): CycleEngine {
  if (!_instance) _instance = new CycleEngine();
  return _instance;
}
