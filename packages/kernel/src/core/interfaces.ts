import type { KernelConfig, LifecyclePhase, Result } from './types';

export interface Kernel {
  readonly phase: LifecyclePhase;
  readonly config: KernelConfig;
  readonly container: DependencyContainer;
  readonly services: ServiceRegistryPort;
  readonly commands: CommandBusPort;
  readonly queries: QueryBusPort;
  readonly events: EventRuntimePort;
  readonly workflows: WorkflowRuntimePort;
  readonly tasks: TaskEnginePort;
  readonly scheduler: SchedulerPort;
  readonly plugins: PluginManagerPort;
  readonly health: HealthMonitorPort;
  readonly state: StateManagerPort;

  boot(): Promise<void>;
  shutdown(graceful?: boolean): Promise<void>;
  restart(): Promise<void>;
}

export interface DependencyContainer {
  register<T>(token: string, factory: () => T, scope?: import('./types').ServiceScope): void;
  resolve<T>(token: string): T;
  has(token: string): boolean;
  dispose(): Promise<void>;
}

export interface ServiceRegistryPort {
  register(metadata: import('./types').ServiceMetadata): void;
  get(id: string): import('./types').ServiceMetadata | undefined;
  list(): import('./types').ServiceMetadata[];
  getStatus(id: string): import('./types').ServiceStatus;
}

export interface CommandBusPort {
  dispatch<R>(command: { type: string; payload: unknown }): Promise<Result<R>>;
}

export interface QueryBusPort {
  query<R>(query: { type: string; payload: unknown }): Promise<Result<R>>;
}

export interface EventRuntimePort {
  publish(event: { type: string; payload: unknown }): Promise<void>;
  subscribe(eventType: string, handler: (event: unknown) => Promise<void>): () => void;
}

export interface WorkflowRuntimePort {
  start(workflowId: string, input?: Record<string, unknown>): Promise<string>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
}

export interface TaskEnginePort {
  submit(task: { type: string; payload: unknown; priority?: import('./types').Priority }): Promise<string>;
  cancel(taskId: string): Promise<void>;
  getStatus(taskId: string): Promise<import('./types').ServiceStatus>;
}

export interface SchedulerPort {
  schedule(jobId: string, cron: string, handler: string): void;
  unschedule(jobId: string): void;
  listJobs(): { id: string; cron: string; nextRun: string }[];
}

export interface PluginManagerPort {
  install(manifestId: string): Promise<void>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  list(): import('./types').PluginManifest[];
}

export interface HealthMonitorPort {
  check(): Promise<HealthReport>;
  getScore(): number;
}

export interface HealthReport {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: { name: string; status: string; latencyMs: number; error?: string }[];
  timestamp: string;
}

export interface StateManagerPort {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  snapshot(): Record<string, unknown>;
  restore(snapshot: Record<string, unknown>): void;
}
