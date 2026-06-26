export type NotificationChannel = 'push' | 'email' | 'sms' | 'desktop' | 'webhook';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  userId: string;
  read: boolean;
  sentAt: string;
  metadata?: Record<string, unknown>;
}

export interface PushNotification extends Notification {
  channel: 'push';
  icon?: string;
  badge?: number;
  data?: Record<string, unknown>;
}

export interface EmailNotification extends Notification {
  channel: 'email';
  to: string;
  from: string;
  subject: string;
  html?: string;
  replyTo?: string;
}

export interface SMSNotification extends Notification {
  channel: 'sms';
  to: string;
  from: string;
}

export interface DesktopNotification extends Notification {
  channel: 'desktop';
  icon?: string;
  sound?: string;
  actions?: { label: string; action: string }[];
}

export interface WebhookNotification extends Notification {
  channel: 'webhook';
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  payload: Record<string, unknown>;
}

export interface NotificationProvider {
  channel: NotificationChannel;
  send(notification: Notification): Promise<{ success: boolean; messageId?: string }>;
}

export interface NotificationRouter {
  register(provider: NotificationProvider): void;
  send(notification: Notification): Promise<void>;
  sendBatch(notifications: Notification[]): Promise<void>;
}
