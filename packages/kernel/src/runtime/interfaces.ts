import type { RuntimeInfo, RuntimeConfig, KernelRuntimeEvent } from './types';

export interface Runtime {
  getInfo(): RuntimeInfo;
  getConfig(): RuntimeConfig;
  updateConfig(config: Partial<RuntimeConfig>): void;
  onEvent(handler: (event: KernelRuntimeEvent) => void): () => void;
  getUptime(): number;
  isHealthy(): boolean;
}
