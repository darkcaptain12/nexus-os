import type { AgentRecord, AgentState } from './types';
import { persistAgentRun } from './agent-repository';
import { deferPersist } from '@/lib/persist-after';

const MAX_AGENTS = 200;

// Agent Runtime store. globalThis hızlı erişim + Supabase write-through (Faz 2):
// add/update sync kalır (mevcut API), arka planda kalıcı yazılır (restart-safe).

class AgentStore {
  private agents: Map<string, AgentRecord> = new Map();
  private insertOrder: string[] = [];

  add(agent: AgentRecord): void {
    this.agents.set(agent.id, agent);
    this.insertOrder.push(agent.id);
    if (this.insertOrder.length > MAX_AGENTS) {
      const evicted = this.insertOrder.shift()!;
      this.agents.delete(evicted);
    }
    deferPersist(() => persistAgentRun(agent)); // write-through
  }

  get(id: string): AgentRecord | null {
    return this.agents.get(id) ?? null;
  }

  update(id: string, updates: Partial<AgentRecord>): AgentRecord | null {
    const agent = this.agents.get(id);
    if (!agent) return null;
    Object.assign(agent, updates, { updatedAt: new Date().toISOString() });
    deferPersist(() => persistAgentRun(agent)); // write-through (state değişimi kalıcı)
    return agent;
  }

  getAll(limit = 50): AgentRecord[] {
    return this.insertOrder
      .slice(-limit)
      .reverse()
      .map((id) => this.agents.get(id)!)
      .filter(Boolean);
  }

  getByState(state: AgentState): AgentRecord[] {
    return [...this.agents.values()].filter((a) => a.state === state);
  }

  remove(id: string): boolean {
    const idx = this.insertOrder.indexOf(id);
    if (idx !== -1) this.insertOrder.splice(idx, 1);
    return this.agents.delete(id);
  }

  getMetrics(): {
    total: number;
    byState: Record<AgentState, number>;
    successRate: number;
    averageRuntimeMs: number;
  } {
    const all = [...this.agents.values()];
    const byState = {
      CREATED: 0,
      READY: 0,
      RUNNING: 0,
      WAITING_APPROVAL: 0,
      WAITING_EVENT: 0,
      RETRYING: 0,
      PAUSED: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    } as Record<AgentState, number>;
    for (const a of all) byState[a.state]++;

    const terminal = all.filter((a) => a.state === 'COMPLETED' || a.state === 'FAILED');
    const successRate =
      terminal.length === 0 ? 100 : Math.round((byState.COMPLETED / terminal.length) * 100);

    const withRuntime = all.filter((a) => a.metrics.runtimeMs > 0);
    const averageRuntimeMs =
      withRuntime.length === 0
        ? 0
        : Math.round(withRuntime.reduce((s, a) => s + a.metrics.runtimeMs, 0) / withRuntime.length);

    return { total: all.length, byState, successRate, averageRuntimeMs };
  }
}

// globalThis üzerinden singleton: dev modda HMR ve bundle-per-entry izolasyonuna dayanıklı
const g = globalThis as unknown as { __apexAgentStore?: AgentStore };

export function getAgentStore(): AgentStore {
  if (!g.__apexAgentStore) g.__apexAgentStore = new AgentStore();
  return g.__apexAgentStore;
}

export { AgentStore };
