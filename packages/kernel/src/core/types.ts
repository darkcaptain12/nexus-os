export type ServiceStatus = 'registered' | 'initializing' | 'running' | 'degraded' | 'stopped' | 'failed';

export type ServiceScope = 'singleton' | 'transient' | 'scoped' | 'lazy';

export type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type LifecyclePhase = 'boot' | 'running' | 'suspending' | 'suspended' | 'resuming' | 'maintenance' | 'shutting-down' | 'stopped' | 'recovery' | 'safe-mode';

export interface ServiceIdentifier {
  id: string;
  name: string;
  version: string;
}

export interface ServiceMetadata extends ServiceIdentifier {
  description: string;
  owner: string;
  scope: ServiceScope;
  status: ServiceStatus;
  dependencies: string[];
  exports: string[];
  permissions: string[];
  tags: string[];
  registeredAt: string;
  startedAt?: string;
}

export interface KernelConfig {
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  services: ServiceRegistration[];
  plugins: PluginManifest[];
  scheduler: SchedulerConfig;
  health: HealthConfig;
}

export interface ServiceRegistration {
  id: string;
  factory: string;
  scope: ServiceScope;
  dependencies: string[];
  config?: Record<string, unknown>;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  permissions: string[];
  dependencies: string[];
}

export interface SchedulerConfig {
  timezone: string;
  maxConcurrentJobs: number;
  defaultRetries: number;
  defaultTimeout: number;
}

export interface HealthConfig {
  checkInterval: number;
  degradedThreshold: number;
  unhealthyThreshold: number;
  alertChannels: string[];
}

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
  metadata?: Record<string, unknown>;
}

export interface Disposable {
  dispose(): Promise<void>;
}
