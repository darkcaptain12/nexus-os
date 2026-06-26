export type ScheduleType = 'cron' | 'interval' | 'one-time' | 'conditional' | 'event-based';
export type JobStatus = 'active' | 'paused' | 'completed' | 'failed' | 'disabled';

export interface ScheduledJob {
  id: string;
  name: string;
  type: ScheduleType;
  handler: string;
  schedule: ScheduleExpression;
  status: JobStatus;
  timezone: string;
  config: JobConfig;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  failCount: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export type ScheduleExpression =
  | { type: 'cron'; expression: string }
  | { type: 'interval'; intervalMs: number }
  | { type: 'one-time'; executeAt: string }
  | { type: 'conditional'; checkInterval: number; condition: string }
  | { type: 'event-based'; eventType: string; filter?: Record<string, unknown> };

export interface JobConfig {
  timeout: number;
  maxRetries: number;
  retryDelayMs: number;
  overlap: boolean;
  catchUp: boolean;
  calendarAware: boolean;
  skipWeekends: boolean;
  skipHolidays: boolean;
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  scheduledAt: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  result?: unknown;
  error?: string;
  skippedReason?: string;
}

export interface SchedulerStats {
  activeJobs: number;
  pausedJobs: number;
  executionsToday: number;
  failuresToday: number;
  nextExecution?: { jobId: string; at: string };
}
