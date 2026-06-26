import type { BaseEntity } from './base';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  due_date?: string;
  completed_at?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}
