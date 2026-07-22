import type { OfflineSnapshot, OfflineMutation, SyncEntity } from './types';

// Offline Store — offline-first cache (Executive/Tasks/Projects/Trading/Commerce/
// Memory summary) + offline mutation kuyruğu. Sync gelince merge (sync-client).

const MAX_MUTATIONS = 500;

const g = globalThis as unknown as {
  __apexOfflineSnapshot?: OfflineSnapshot;
  __apexOfflineQueue?: OfflineMutation[];
};

export function cacheSnapshot(snapshot: OfflineSnapshot): void {
  g.__apexOfflineSnapshot = snapshot;
}

export function getSnapshot(): OfflineSnapshot | null {
  return g.__apexOfflineSnapshot ?? null;
}

function queue(): OfflineMutation[] {
  if (!g.__apexOfflineQueue) g.__apexOfflineQueue = [];
  return g.__apexOfflineQueue;
}

/** Offline'da yapılan değişiklik — sync gelince uygulanmak üzere kuyruğa. */
export function enqueueMutation(input: {
  entity: SyncEntity;
  action: string;
  payload: Record<string, unknown>;
  deviceId: string;
}): OfflineMutation {
  const mutation: OfflineMutation = {
    id: crypto.randomUUID(),
    entity: input.entity,
    action: input.action,
    payload: input.payload,
    deviceId: input.deviceId,
    createdAt: new Date().toISOString(),
  };
  const q = queue();
  q.push(mutation);
  if (q.length > MAX_MUTATIONS) q.shift();
  return mutation;
}

export function getPendingMutations(): OfflineMutation[] {
  return [...queue()];
}

export function dequeueMutations(ids: string[]): void {
  const idSet = new Set(ids);
  g.__apexOfflineQueue = queue().filter((m) => !idSet.has(m.id));
}

export function getOfflineQueueLength(): number {
  return queue().length;
}

export function clearOffline(): void {
  g.__apexOfflineSnapshot = undefined;
  g.__apexOfflineQueue = [];
}
