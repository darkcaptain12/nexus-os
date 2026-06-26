import type { ServiceScope } from '../core/types';

export interface Binding<T = unknown> {
  token: string;
  scope: ServiceScope;
  factory: BindingFactory<T>;
  instance?: T;
  metadata: BindingMetadata;
}

export type BindingFactory<T = unknown> = (container: ContainerResolver) => T;

export interface ContainerResolver {
  resolve<T>(token: string): T;
  has(token: string): boolean;
}

export interface BindingMetadata {
  registeredAt: string;
  resolvedCount: number;
  lastResolvedAt?: string;
  tags: string[];
  lazy: boolean;
}

export interface ScopedContext {
  id: string;
  parentId?: string;
  instances: Map<string, unknown>;
  createdAt: string;
  disposables: Array<{ dispose(): Promise<void> }>;
}

export interface CircularDependencyError {
  chain: string[];
  message: string;
}

export interface ContainerStats {
  totalBindings: number;
  singletons: number;
  transients: number;
  scoped: number;
  lazy: number;
  resolvedCount: number;
  activeScopes: number;
}
