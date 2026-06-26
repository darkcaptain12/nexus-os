import type { ServiceScope, ServiceStatus, Disposable } from '../core/types';

export interface ServiceDescriptor {
  id: string;
  name: string;
  version: string;
  scope: ServiceScope;
  factory: string;
  dependencies: string[];
  config: Record<string, unknown>;
}

export interface ManagedService extends Disposable {
  readonly id: string;
  readonly status: ServiceStatus;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<ServiceHealthResult>;
}

export interface ServiceHealthResult {
  healthy: boolean;
  latencyMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface ServiceEvent {
  serviceId: string;
  event: 'registered' | 'initialized' | 'started' | 'stopped' | 'failed' | 'health-changed';
  previousStatus?: ServiceStatus;
  currentStatus: ServiceStatus;
  timestamp: string;
  error?: string;
}
