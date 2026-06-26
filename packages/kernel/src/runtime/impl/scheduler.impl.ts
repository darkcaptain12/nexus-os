import type { ScheduledJob, JobExecution, JobStatus, SchedulerStats, ScheduleExpression } from '../../scheduler/types';
import type { Scheduler } from '../../scheduler/interfaces';
import type { Logger } from '@apex-os/logger';

interface ActiveJob {
  job: ScheduledJob;
  timer?: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
  handler?: () => Promise<void>;
}

export class InMemoryScheduler implements Scheduler {
  private jobs = new Map<string, ActiveJob>();
  private executions: JobExecution[] = [];
  private handlers = new Map<string, () => Promise<void>>();
  private running = false;
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  register(
    job: Omit<ScheduledJob, 'runCount' | 'failCount' | 'createdAt'>,
  ): ScheduledJob {
    const scheduled: ScheduledJob = {
      ...job,
      runCount: 0,
      failCount: 0,
      createdAt: new Date().toISOString(),
      nextRunAt: this.calculateNextRun(job.schedule),
    };

    const active: ActiveJob = { job: scheduled };
    this.jobs.set(job.id, active);

    if (this.running && scheduled.status === 'active') {
      this.startJob(active);
    }

    this.log.debug(`Job registered: ${job.name}`, { jobId: job.id, type: job.type });
    return scheduled;
  }

  unregister(jobId: string): void {
    const active = this.jobs.get(jobId);
    if (active?.timer) {
      clearInterval(active.timer as ReturnType<typeof setInterval>);
      clearTimeout(active.timer as ReturnType<typeof setTimeout>);
    }
    this.jobs.delete(jobId);
  }

  pause(jobId: string): void {
    const active = this.jobs.get(jobId);
    if (!active) return;
    active.job.status = 'paused';
    if (active.timer) {
      clearInterval(active.timer as ReturnType<typeof setInterval>);
      clearTimeout(active.timer as ReturnType<typeof setTimeout>);
      active.timer = undefined;
    }
  }

  resume(jobId: string): void {
    const active = this.jobs.get(jobId);
    if (!active) return;
    active.job.status = 'active';
    if (this.running) {
      this.startJob(active);
    }
  }

  async trigger(jobId: string): Promise<JobExecution> {
    const active = this.jobs.get(jobId);
    if (!active) {
      return {
        id: crypto.randomUUID(),
        jobId,
        status: 'failed',
        scheduledAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        error: 'Job not found',
      };
    }
    return this.executeJob(active);
  }

  get(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId)?.job;
  }

  list(status?: JobStatus): ScheduledJob[] {
    const jobs = [...this.jobs.values()].map((a) => a.job);
    return status ? jobs.filter((j) => j.status === status) : jobs;
  }

  async getHistory(jobId: string, limit = 10): Promise<JobExecution[]> {
    return this.executions
      .filter((e) => e.jobId === jobId)
      .slice(-limit);
  }

  getStats(): SchedulerStats {
    const jobs = [...this.jobs.values()].map((a) => a.job);
    const today = new Date().toISOString().split('T')[0];
    const todayExecs = this.executions.filter((e) => e.startedAt.startsWith(today!));

    const activeJobs = jobs.filter((j) => j.status === 'active');
    let nextExecution: { jobId: string; at: string } | undefined;

    for (const job of activeJobs) {
      if (job.nextRunAt && (!nextExecution || job.nextRunAt < nextExecution.at)) {
        nextExecution = { jobId: job.id, at: job.nextRunAt };
      }
    }

    return {
      activeJobs: activeJobs.length,
      pausedJobs: jobs.filter((j) => j.status === 'paused').length,
      executionsToday: todayExecs.length,
      failuresToday: todayExecs.filter((e) => e.status === 'failed').length,
      nextExecution,
    };
  }

  registerHandler(name: string, handler: () => Promise<void>): void {
    this.handlers.set(name, handler);
  }

  start(): void {
    this.running = true;
    for (const active of this.jobs.values()) {
      if (active.job.status === 'active') {
        this.startJob(active);
      }
    }
    this.log.info('Scheduler started', { jobCount: this.jobs.size });
  }

  stop(): void {
    this.running = false;
    for (const active of this.jobs.values()) {
      if (active.timer) {
        clearInterval(active.timer as ReturnType<typeof setInterval>);
        clearTimeout(active.timer as ReturnType<typeof setTimeout>);
        active.timer = undefined;
      }
    }
    this.log.info('Scheduler stopped');
  }

  private startJob(active: ActiveJob): void {
    const { job } = active;
    const schedule = job.schedule;

    if (schedule.type === 'interval') {
      active.timer = setInterval(async () => {
        await this.executeJob(active);
      }, schedule.intervalMs);
    } else if (schedule.type === 'one-time') {
      const delay = Math.max(0, new Date(schedule.executeAt).getTime() - Date.now());
      active.timer = setTimeout(async () => {
        await this.executeJob(active);
        active.job.status = 'completed';
      }, delay);
    }
  }

  private async executeJob(active: ActiveJob): Promise<JobExecution> {
    const { job } = active;
    const execution: JobExecution = {
      id: crypto.randomUUID(),
      jobId: job.id,
      status: 'running',
      scheduledAt: job.nextRunAt ?? new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    const handler = this.handlers.get(job.handler);
    if (!handler) {
      execution.status = 'failed';
      execution.error = `Handler not found: ${job.handler}`;
      execution.completedAt = new Date().toISOString();
      job.failCount++;
      this.executions.push(execution);
      return execution;
    }

    const start = performance.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Job timeout')), job.config.timeout),
      );
      await Promise.race([handler(), timeoutPromise]);
      execution.status = 'completed';
      job.runCount++;
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : String(err);
      job.failCount++;
      this.log.error(`Job failed: ${job.name}`, { jobId: job.id, error: execution.error });
    }

    execution.completedAt = new Date().toISOString();
    execution.durationMs = Math.round(performance.now() - start);
    job.lastRunAt = execution.completedAt;
    job.nextRunAt = this.calculateNextRun(job.schedule);
    this.executions.push(execution);

    return execution;
  }

  private calculateNextRun(schedule: ScheduleExpression): string | undefined {
    if (schedule.type === 'interval') {
      return new Date(Date.now() + schedule.intervalMs).toISOString();
    }
    if (schedule.type === 'one-time') {
      return schedule.executeAt;
    }
    return undefined;
  }
}
