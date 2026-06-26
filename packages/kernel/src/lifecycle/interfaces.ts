import type { LifecyclePhase } from '../core/types';
import type { LifecycleTransition, BootSequence, ShutdownOptions, RecoveryPlan } from './types';

export interface LifecycleManager {
  boot(): Promise<BootSequence>;
  shutdown(options?: ShutdownOptions): Promise<void>;
  restart(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  enterMaintenance(): Promise<void>;
  exitMaintenance(): Promise<void>;
  enterSafeMode(): Promise<void>;
  recover(plan: RecoveryPlan): Promise<void>;
  getPhase(): LifecyclePhase;
  getHistory(): LifecycleTransition[];
  onTransition(handler: (transition: LifecycleTransition) => void): () => void;
}

export interface GracefulShutdown {
  register(name: string, handler: () => Promise<void>, priority: number): void;
  execute(timeout: number): Promise<ShutdownReport>;
}

export interface ShutdownReport {
  completed: string[];
  timedOut: string[];
  failed: { name: string; error: string }[];
  totalDurationMs: number;
}
