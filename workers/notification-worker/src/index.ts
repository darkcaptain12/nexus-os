export interface NotificationWorkerConfig {
  batchSize: number;
  retryAttempts: number;
  channels: string[];
}

export interface NotificationJob {
  id: string;
  channel: 'push' | 'email' | 'sms' | 'desktop' | 'webhook';
  recipient: string;
  payload: Record<string, unknown>;
  priority: number;
  scheduledAt?: string;
}
