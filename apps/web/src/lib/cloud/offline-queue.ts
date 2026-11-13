import type { CloudQueueItem, SyncDomain, SyncOperation } from './types';

// Offline Queue — ağ yokken işlemler kuyruğa; ağ gelince sırayla uygulanır.
// Exponential backoff retry + content-hash duplicate prevention. Ring buffer.

const MAX_QUEUE = 500;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000; // 1s → 2s → 4s → 8s → 16s

const g = globalThis as unknown as { __apexCloudOfflineQueue?: CloudQueueItem[] };

function queue(): CloudQueueItem[] {
  if (!g.__apexCloudOfflineQueue) g.__apexCloudOfflineQueue = [];
  return g.__apexCloudOfflineQueue;
}

/** Deterministik content hash — aynı işlem ikinci kez kuyruğa giremez. */
export function contentHash(
  domain: string,
  key: string,
  operation: string,
  payload: Record<string, unknown>,
): string {
  const raw = `${domain}|${key}|${operation}|${JSON.stringify(payload)}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}:${raw.length}`;
}

export interface EnqueueCloudInput {
  domain: SyncDomain;
  key: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  deviceId: string;
}

/** Kuyruğa al — duplicate ise mevcut kaydı döner (idempotent). */
export function enqueueCloudMutation(input: EnqueueCloudInput): {
  item: CloudQueueItem;
  duplicate: boolean;
} {
  const hash = contentHash(input.domain, input.key, input.operation, input.payload);
  const existing = queue().find((i) => i.contentHash === hash);
  if (existing) return { item: existing, duplicate: true };

  const item: CloudQueueItem = {
    id: crypto.randomUUID(),
    domain: input.domain,
    key: input.key,
    operation: input.operation,
    payload: input.payload,
    deviceId: input.deviceId,
    contentHash: hash,
    attempts: 0,
    nextRetryAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const q = queue();
  q.push(item);
  if (q.length > MAX_QUEUE) q.shift();
  return { item, duplicate: false };
}

export type QueueApplyFn = (item: CloudQueueItem) => { applied: boolean; manualReview: boolean };

/**
 * Kuyruğu işle — sırayla apply fonksiyonuna (sync-engine pushDelta) uygular.
 * Başarısız olan backoff ile kuyrukta kalır; MAX_ATTEMPTS aşan düşer.
 * Dependency injection: circular import yok (sync-engine bu modülü import eder).
 */
export function processOfflineQueue(apply: QueueApplyFn): {
  applied: number;
  retried: number;
  dropped: number;
  conflicts: number;
} {
  const now = Date.now();
  const q = queue();
  let applied = 0;
  let retried = 0;
  let dropped = 0;
  let conflicts = 0;
  const remaining: CloudQueueItem[] = [];

  for (const item of q) {
    if (new Date(item.nextRetryAt).getTime() > now) {
      remaining.push(item); // backoff süresi dolmamış
      continue;
    }
    try {
      const result = apply(item);
      if (result.manualReview) {
        conflicts++; // manual-review — kuyruktan çıkar, conflict kuyruğunda bekler
      } else if (result.applied) {
        applied++;
      } else {
        throw new Error('apply başarısız'); // retry yoluna düşer
      }
    } catch {
      item.attempts++;
      if (item.attempts >= MAX_ATTEMPTS) {
        dropped++;
        continue;
      }
      item.nextRetryAt = new Date(now + BASE_BACKOFF_MS * 2 ** item.attempts).toISOString();
      retried++;
      remaining.push(item);
    }
  }

  g.__apexCloudOfflineQueue = remaining;
  return { applied, retried, dropped, conflicts };
}

export function getCloudQueue(): CloudQueueItem[] {
  return [...queue()];
}

export function getCloudQueueLength(): number {
  return queue().length;
}

export function clearCloudQueue(): void {
  g.__apexCloudOfflineQueue = [];
}
