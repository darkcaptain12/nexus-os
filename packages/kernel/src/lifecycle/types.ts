import type { LifecyclePhase } from '../core/types';

export interface LifecycleTransition {
  from: LifecyclePhase;
  to: LifecyclePhase;
  trigger: string;
  timestamp: string;
  durationMs: number;
  error?: string;
}

export interface BootSequence {
  steps: BootStep[];
  totalDurationMs: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface BootStep {
  name: string;
  order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  durationMs?: number;
  error?: string;
  critical: boolean;
}

export interface ShutdownOptions {
  graceful: boolean;
  timeout: number;
  drainQueues: boolean;
  saveState: boolean;
  notifyServices: boolean;
}

export interface RecoveryPlan {
  id: string;
  trigger: string;
  steps: RecoveryStep[];
  maxAttempts: number;
}

export interface RecoveryStep {
  action: string;
  target: string;
  timeout: number;
  fallback?: string;
}
