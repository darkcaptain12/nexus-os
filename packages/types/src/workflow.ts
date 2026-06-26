import type { BaseEntity } from './base';

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

export interface Workflow extends BaseEntity {
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  steps: WorkflowStep[];
  last_run_at?: string;
  run_count: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
}
