import type { BaseEntity } from './base';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal extends BaseEntity {
  title: string;
  description?: string;
  status: GoalStatus;
  target_date?: string;
  progress: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}
