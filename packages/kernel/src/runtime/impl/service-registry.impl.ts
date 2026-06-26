import type { ServiceMetadata, ServiceStatus } from '../../core/types';
import type { RegistryEntry, DependencyGraph, RegistrySnapshot, RegistryQuery } from '../../registry/types';
import type { ServiceRegistry } from '../../registry/interfaces';
import type { Logger } from '@apex-os/logger';

export class InMemoryServiceRegistry implements ServiceRegistry {
  private entries = new Map<string, RegistryEntry>();
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  register(metadata: ServiceMetadata): RegistryEntry {
    const entry: RegistryEntry = {
      metadata,
      health: {
        status: metadata.status,
        lastCheck: new Date().toISOString(),
        latencyMs: 0,
        consecutiveFailures: 0,
        uptime: 0,
      },
      startOrder: this.entries.size,
      stopOrder: 0,
    };
    this.entries.set(metadata.id, entry);
    this.recalculateStopOrder();
    this.log.debug(`Service registered: ${metadata.name}`, { serviceId: metadata.id });
    return entry;
  }

  unregister(serviceId: string): void {
    this.entries.delete(serviceId);
    this.recalculateStopOrder();
  }

  get(serviceId: string): RegistryEntry | undefined {
    return this.entries.get(serviceId);
  }

  list(query?: RegistryQuery): RegistryEntry[] {
    let entries = [...this.entries.values()];
    if (query?.status) {
      entries = entries.filter((e) => e.metadata.status === query.status);
    }
    if (query?.owner) {
      entries = entries.filter((e) => e.metadata.owner === query.owner);
    }
    if (query?.tag) {
      entries = entries.filter((e) => e.metadata.tags.includes(query.tag!));
    }
    if (query?.hasExport) {
      entries = entries.filter((e) => e.metadata.exports.includes(query.hasExport!));
    }
    if (query?.hasDependency) {
      entries = entries.filter((e) => e.metadata.dependencies.includes(query.hasDependency!));
    }
    return entries;
  }

  updateStatus(serviceId: string, status: ServiceStatus, error?: string): void {
    const entry = this.entries.get(serviceId);
    if (!entry) return;
    entry.metadata.status = status;
    entry.health.status = status;
    entry.health.lastCheck = new Date().toISOString();
    if (error) {
      entry.health.error = error;
      entry.health.consecutiveFailures++;
    } else {
      entry.health.consecutiveFailures = 0;
      entry.health.error = undefined;
    }
    if (status === 'running' && !entry.metadata.startedAt) {
      entry.metadata.startedAt = new Date().toISOString();
    }
  }

  getDependencyGraph(): DependencyGraph {
    const nodes = [...this.entries.values()].map((e) => ({
      serviceId: e.metadata.id,
      status: e.metadata.status,
    }));

    const edges = [...this.entries.values()].flatMap((e) =>
      e.metadata.dependencies.map((dep) => ({
        from: e.metadata.id,
        to: dep,
        required: true,
      })),
    );

    const { order, hasCycles, cycles } = this.topologicalSort();

    return { nodes, edges, topologicalOrder: order, hasCycles, cycles };
  }

  getStartOrder(): string[] {
    const { order } = this.topologicalSort();
    return order;
  }

  getStopOrder(): string[] {
    return this.getStartOrder().reverse();
  }

  snapshot(): RegistrySnapshot {
    const entries = [...this.entries.values()];
    return {
      entries,
      totalServices: entries.length,
      runningServices: entries.filter((e) => e.metadata.status === 'running').length,
      failedServices: entries.filter((e) => e.metadata.status === 'failed').length,
      timestamp: new Date().toISOString(),
    };
  }

  restore(snapshot: RegistrySnapshot): void {
    this.entries.clear();
    for (const entry of snapshot.entries) {
      this.entries.set(entry.metadata.id, entry);
    }
  }

  private topologicalSort(): { order: string[]; hasCycles: boolean; cycles: string[][] } {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    const cycles: string[][] = [];

    const visit = (id: string, path: string[]): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        const cycleStart = path.indexOf(id);
        cycles.push(path.slice(cycleStart));
        return;
      }

      visiting.add(id);
      const entry = this.entries.get(id);
      if (entry) {
        for (const dep of entry.metadata.dependencies) {
          if (this.entries.has(dep)) {
            visit(dep, [...path, id]);
          }
        }
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of this.entries.keys()) {
      visit(id, []);
    }

    return { order, hasCycles: cycles.length > 0, cycles };
  }

  private recalculateStopOrder(): void {
    const startOrder = this.getStartOrder();
    const reversed = [...startOrder].reverse();
    reversed.forEach((id, i) => {
      const entry = this.entries.get(id);
      if (entry) entry.stopOrder = i;
    });
  }
}
