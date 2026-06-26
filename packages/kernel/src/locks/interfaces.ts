import type { Lock, LockOptions, SemaphoreConfig, LockStats } from './types';

export interface LockManager {
  acquire(resource: string, owner: string, options?: Partial<LockOptions>): Promise<Lock>;
  release(lockId: string): Promise<void>;
  extend(lockId: string, ttl: number): Promise<Lock>;
  isLocked(resource: string): boolean;
  getOwner(resource: string): string | undefined;
  forceRelease(resource: string): Promise<void>;
  withLock<T>(resource: string, owner: string, fn: () => Promise<T>, options?: Partial<LockOptions>): Promise<T>;
  getStats(): LockStats;
}

export interface Semaphore {
  acquire(owner: string): Promise<Lock>;
  release(lockId: string): Promise<void>;
  available(): number;
  waiting(): number;
}

export interface SemaphoreFactory {
  create(config: SemaphoreConfig): Semaphore;
}
