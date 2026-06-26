import type { ServiceScope } from '../core/types';
import type { BindingFactory, ScopedContext, ContainerStats, CircularDependencyError } from './types';

export interface Container {
  register<T>(token: string, factory: BindingFactory<T>, scope?: ServiceScope): void;
  registerSingleton<T>(token: string, factory: BindingFactory<T>): void;
  registerTransient<T>(token: string, factory: BindingFactory<T>): void;
  registerScoped<T>(token: string, factory: BindingFactory<T>): void;
  registerLazy<T>(token: string, factory: BindingFactory<T>): void;
  registerValue<T>(token: string, value: T): void;
  resolve<T>(token: string): T;
  tryResolve<T>(token: string): T | undefined;
  has(token: string): boolean;
  unregister(token: string): void;
  createScope(scopeId?: string): ScopedContainer;
  validateDependencies(): CircularDependencyError[];
  getStats(): ContainerStats;
  dispose(): Promise<void>;
}

export interface ScopedContainer extends Container {
  readonly scopeId: string;
  readonly context: ScopedContext;
  disposeScope(): Promise<void>;
}

export interface ServiceFactory<T> {
  create(resolver: import('./types').ContainerResolver): T;
}

export interface ServiceDiscovery {
  discover(tag: string): string[];
  discoverByScope(scope: ServiceScope): string[];
  getMetadata(token: string): import('./types').BindingMetadata | undefined;
}
