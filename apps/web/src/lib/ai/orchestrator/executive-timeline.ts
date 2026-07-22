import type { ExecutiveTimelineEntry } from '../types';

const MAX_TIMELINE = 100;

class ExecutiveTimeline {
  private entries: ExecutiveTimelineEntry[] = [];

  add(entry: ExecutiveTimelineEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_TIMELINE) {
      this.entries.splice(0, this.entries.length - MAX_TIMELINE);
    }
  }

  update(cycleId: string, updates: Partial<ExecutiveTimelineEntry>): void {
    const entry = this.entries.find((e) => e.cycleId === cycleId);
    if (entry) Object.assign(entry, updates);
  }

  getAll(limit = 50): ExecutiveTimelineEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getLatest(): ExecutiveTimelineEntry | null {
    return this.entries[this.entries.length - 1] ?? null;
  }

  getByCycleId(cycleId: string): ExecutiveTimelineEntry | undefined {
    return this.entries.find((e) => e.cycleId === cycleId);
  }
}

let _instance: ExecutiveTimeline | null = null;

export function getExecutiveTimeline(): ExecutiveTimeline {
  if (!_instance) _instance = new ExecutiveTimeline();
  return _instance;
}
