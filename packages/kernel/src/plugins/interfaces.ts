import type { PluginDescriptor, PluginInstance, PluginStatus } from './types';

export interface PluginManager {
  install(descriptor: PluginDescriptor): Promise<PluginInstance>;
  uninstall(pluginId: string): Promise<void>;
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  get(pluginId: string): PluginInstance | undefined;
  list(status?: PluginStatus): PluginInstance[];
  reload(pluginId: string): Promise<void>;
  validateDependencies(pluginId: string): DependencyValidation;
  healthCheck(pluginId: string): Promise<PluginInstance>;
}

export interface DependencyValidation {
  valid: boolean;
  missing: string[];
  versionMismatches: { pluginId: string; required: string; actual: string }[];
}
