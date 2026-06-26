export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'error' | 'unloading';

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  dependencies: PluginDependency[];
  exports: string[];
  entryPoint: string;
  config?: Record<string, unknown>;
}

export interface PluginDependency {
  pluginId: string;
  version: string;
  optional: boolean;
}

export interface PluginInstance {
  descriptor: PluginDescriptor;
  status: PluginStatus;
  installedAt: string;
  enabledAt?: string;
  error?: string;
  health: 'healthy' | 'degraded' | 'unavailable';
}

export interface PluginHooks {
  onInstall?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onHealthCheck?(): Promise<{ healthy: boolean; error?: string }>;
}

export interface PluginSandbox {
  allowedAPIs: string[];
  memoryLimitMb: number;
  cpuTimeoutMs: number;
  networkAccess: boolean;
  fileSystemAccess: 'none' | 'read' | 'read-write';
}
