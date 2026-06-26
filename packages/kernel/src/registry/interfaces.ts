import type { ServiceMetadata, ServiceStatus } from '../core/types';
import type { RegistryEntry, RegistryQuery, RegistrySnapshot, DependencyGraph } from './types';

export interface ServiceRegistry {
  register(metadata: ServiceMetadata): RegistryEntry;
  unregister(serviceId: string): void;
  get(serviceId: string): RegistryEntry | undefined;
  list(query?: RegistryQuery): RegistryEntry[];
  updateStatus(serviceId: string, status: ServiceStatus, error?: string): void;
  getDependencyGraph(): DependencyGraph;
  getStartOrder(): string[];
  getStopOrder(): string[];
  snapshot(): RegistrySnapshot;
  restore(snapshot: RegistrySnapshot): void;
}

export interface ServiceResolver {
  resolve(serviceId: string): unknown;
  resolveAll(serviceIds: string[]): Map<string, unknown>;
  canResolve(serviceId: string): boolean;
}

export interface DependencyValidator {
  validate(): ValidationResult;
  checkCircular(): string[][];
  checkMissing(): string[];
  checkVersionConflicts(): VersionConflict[];
}

export interface ValidationResult {
  valid: boolean;
  errors: { serviceId: string; message: string }[];
  warnings: { serviceId: string; message: string }[];
}

export interface VersionConflict {
  serviceId: string;
  requiredBy: string;
  requiredVersion: string;
  actualVersion: string;
}
