import type { ScheduledJob, JobExecution, JobStatus, SchedulerStats } from './types';

export interface Scheduler {
  register(job: Omit<ScheduledJob, 'runCount' | 'failCount' | 'createdAt'>): ScheduledJob;
  unregister(jobId: string): void;
  pause(jobId: string): void;
  resume(jobId: string): void;
  trigger(jobId: string): Promise<JobExecution>;
  get(jobId: string): ScheduledJob | undefined;
  list(status?: JobStatus): ScheduledJob[];
  getHistory(jobId: string, limit?: number): Promise<JobExecution[]>;
  getStats(): SchedulerStats;
  start(): void;
  stop(): void;
}

export interface CronParser {
  parse(expression: string): CronSchedule;
  next(expression: string, after?: Date): Date;
  nextN(expression: string, count: number, after?: Date): Date[];
  validate(expression: string): boolean;
}

export interface CronSchedule {
  expression: string;
  description: string;
  next: Date;
  timezone: string;
}

export interface CalendarProvider {
  isBusinessDay(date: Date, timezone: string): boolean;
  isHoliday(date: Date, timezone: string): boolean;
  nextBusinessDay(date: Date, timezone: string): Date;
}
