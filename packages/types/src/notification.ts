import type { BaseEntity } from './base';

export interface Notification extends BaseEntity {
  user_id: string;
  channel: 'push' | 'email' | 'sms' | 'desktop' | 'webhook';
  title: string;
  body: string;
  read: boolean;
  read_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
}
