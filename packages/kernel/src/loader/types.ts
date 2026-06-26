export interface ModuleDescriptor {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  dependencies: string[];
  lazy: boolean;
  isolated: boolean;
  compatible: VersionRange;
}

export interface VersionRange {
  min: string;
  max?: string;
}

export interface LoadedModule {
  descriptor: ModuleDescriptor;
  instance: unknown;
  loadedAt: string;
  loadTimeMs: number;
  status: 'loaded' | 'initializing' | 'ready' | 'error' | 'unloaded';
}

export interface LoaderStats {
  totalModules: number;
  loadedModules: number;
  lazyModules: number;
  isolatedModules: number;
  totalLoadTimeMs: number;
}
