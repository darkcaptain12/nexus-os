import type { ManagedService, ServiceDescriptor, ServiceEvent } from './types';

export interface ServiceManager {
  register(descriptor: ServiceDescriptor): void;
  initialize(serviceId: string): Promise<ManagedService>;
  initializeAll(): Promise<ManagedService[]>;
  start(serviceId: string): Promise<void>;
  startAll(): Promise<void>;
  stop(serviceId: string): Promise<void>;
  stopAll(): Promise<void>;
  restart(serviceId: string): Promise<void>;
  get(serviceId: string): ManagedService | undefined;
  onServiceEvent(handler: (event: ServiceEvent) => void): () => void;
}

export interface ServiceLifecycleHook {
  onBeforeInitialize?(serviceId: string): Promise<void>;
  onAfterInitialize?(serviceId: string): Promise<void>;
  onBeforeStart?(serviceId: string): Promise<void>;
  onAfterStart?(serviceId: string): Promise<void>;
  onBeforeStop?(serviceId: string): Promise<void>;
  onAfterStop?(serviceId: string): Promise<void>;
}
