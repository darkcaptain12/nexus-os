import type { Workflow } from '../types';
import type { WorkflowRuntime } from './engine';
import { parseCronNextRun, shouldRunInBusinessHours } from '../triggers/registry';

export class WorkflowScheduler {
  private runtime: WorkflowRuntime;
  private interval: ReturnType<typeof setInterval> | null = null;
  private nextRuns = new Map<string, string>();

  constructor(runtime: WorkflowRuntime) {
    this.runtime = runtime;
  }

  start(checkIntervalMs = 60000): void {
    if (this.interval) return;
    this.computeNextRuns();
    this.interval = setInterval(() => this.tick(), checkIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private computeNextRuns(): void {
    for (const wf of this.runtime.listWorkflows()) {
      if (wf.status === 'enabled' && wf.trigger.type === 'schedule') {
        const cron = wf.trigger.config['cron'] as string;
        const tz = (wf.trigger.config['timezone'] as string) ?? 'Europe/Istanbul';
        if (cron) {
          this.nextRuns.set(wf.id, parseCronNextRun(cron, tz));
        }
      }
    }
  }

  private async tick(): Promise<void> {
    const now = new Date();

    for (const wf of this.runtime.listWorkflows()) {
      if (wf.status !== 'enabled' || wf.trigger.type !== 'schedule') continue;

      const nextRun = this.nextRuns.get(wf.id);
      if (!nextRun || new Date(nextRun) > now) continue;

      const businessHoursOnly = (wf.trigger.config['businessHoursOnly'] as boolean) ?? false;
      const excludeWeekends = (wf.trigger.config['excludeWeekends'] as boolean) ?? false;

      if (!shouldRunInBusinessHours({
        timezone: (wf.trigger.config['timezone'] as string) ?? 'Europe/Istanbul',
        businessHoursOnly,
        excludeWeekends,
        jitterMs: 0,
      })) {
        this.advanceNextRun(wf);
        continue;
      }

      try {
        await this.runtime.run(wf.id, 'scheduler');
      } catch {
        // Execution failed — logged in runtime history
      }

      this.advanceNextRun(wf);
    }
  }

  private advanceNextRun(wf: Workflow): void {
    const cron = wf.trigger.config['cron'] as string;
    const tz = (wf.trigger.config['timezone'] as string) ?? 'Europe/Istanbul';
    if (cron) {
      this.nextRuns.set(wf.id, parseCronNextRun(cron, tz));
    }
  }

  getNextRuns(): { workflowId: string; nextRun: string }[] {
    return [...this.nextRuns.entries()].map(([workflowId, nextRun]) => ({ workflowId, nextRun }));
  }
}
