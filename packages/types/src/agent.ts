import type { BaseEntity } from './base';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export interface Agent extends BaseEntity {
  name: string;
  description: string;
  type: string;
  status: AgentStatus;
  capabilities: string[];
  config: Record<string, unknown>;
  last_run_at?: string;
  total_runs: number;
  success_rate: number;
}
