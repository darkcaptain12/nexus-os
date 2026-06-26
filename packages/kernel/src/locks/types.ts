export type LockType = 'mutex' | 'semaphore' | 'read-write' | 'distributed';

export interface Lock {
  id: string;
  resource: string;
  type: LockType;
  owner: string;
  acquiredAt: string;
  expiresAt: string;
  ttl: number;
  metadata?: Record<string, unknown>;
}

export interface LockOptions {
  ttl: number;
  retryCount: number;
  retryDelayMs: number;
  waitTimeout: number;
}

export interface SemaphoreConfig {
  resource: string;
  maxConcurrency: number;
  ttl: number;
}

export interface LockStats {
  activeLocks: number;
  waitingRequests: number;
  acquiredTotal: number;
  timeoutTotal: number;
  averageHoldTimeMs: number;
}
