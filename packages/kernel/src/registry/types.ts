import type { ServiceStatus, ServiceMetadata } from '../core/types';

export interface RegistryEntry {
  metadata: ServiceMetadata;
  health: ServiceHealthStatus;
  startOrder: number;
  stopOrder: number;
}

export interface ServiceHealthStatus {
  status: ServiceStatus;
  lastCheck: string;
  latencyMs: number;
  consecutiveFailures: number;
  uptime: number;
  error?: string;
}

export interface RegistryQuery {
  status?: ServiceStatus;
  owner?: string;
  tag?: string;
  hasExport?: string;
  hasDependency?: string;
}

export interface RegistrySnapshot {
  entries: RegistryEntry[];
  totalServices: number;
  runningServices: number;
  failedServices: number;
  timestamp: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  topologicalOrder: string[];
  hasCycles: boolean;
  cycles: string[][];
}

export interface DependencyNode {
  serviceId: string;
  status: ServiceStatus;
}

export interface DependencyEdge {
  from: string;
  to: string;
  required: boolean;
}
