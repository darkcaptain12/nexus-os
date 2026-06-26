import type { ModuleDescriptor, LoadedModule, LoaderStats } from './types';

export interface ModuleLoader {
  load(descriptor: ModuleDescriptor): Promise<LoadedModule>;
  unload(moduleId: string): Promise<void>;
  reload(moduleId: string): Promise<LoadedModule>;
  get(moduleId: string): LoadedModule | undefined;
  list(): LoadedModule[];
  isLoaded(moduleId: string): boolean;
  validateCompatibility(moduleId: string): CompatibilityResult;
  getStats(): LoaderStats;
}

export interface CompatibilityResult {
  compatible: boolean;
  issues: { dependency: string; required: string; available: string }[];
}

export interface LazyLoader {
  register(moduleId: string, descriptor: ModuleDescriptor): void;
  ensure(moduleId: string): Promise<LoadedModule>;
  isRegistered(moduleId: string): boolean;
}
