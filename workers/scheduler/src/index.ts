export interface SchedulerConfig {
  checkInterval: number;
  timezone: string;
  maxConcurrentJobs: number;
}

export interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  handler: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  metadata?: Record<string, unknown>;
}
