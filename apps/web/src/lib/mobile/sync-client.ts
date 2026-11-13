import type { SyncResult, SyncConflictStrategy, OfflineMutation } from './types';
import { getPendingMutations, dequeueMutations, getOfflineQueueLength } from './offline-store';

// Sync Client — offline mutation kuyruğunu server'a merge eder. Conflict
// resolution: last-write-wins varsayılan (server timestamp ile karşılaştırma).
// Cloud Sync mevcut Supabase üstünde; bu katman kuyruk + conflict yönetir.

const g = globalThis as unknown as {
  __apexLastSyncAt?: string;
  __apexServerVersions?: Map<string, string>; // entity:id → son server updatedAt
};

function serverVersions(): Map<string, string> {
  if (!g.__apexServerVersions) g.__apexServerVersions = new Map();
  return g.__apexServerVersions;
}

/** Server tarafındaki güncel versiyonu bildir (conflict tespiti için). */
export function recordServerVersion(entity: string, id: string, updatedAt: string): void {
  serverVersions().set(`${entity}:${id}`, updatedAt);
}

function resolveConflict(
  mutation: OfflineMutation,
  strategy: SyncConflictStrategy,
): { apply: boolean; reason: string } {
  const key = `${mutation.entity}:${(mutation.payload['id'] as string) ?? ''}`;
  const serverVersion = serverVersions().get(key);

  if (!serverVersion) return { apply: true, reason: 'server versiyonu yok — uygulanır' };

  switch (strategy) {
    case 'server-wins':
      return { apply: false, reason: 'server-wins: server versiyonu korundu' };
    case 'client-wins':
      return { apply: true, reason: 'client-wins: istemci değişikliği uygulandı' };
    case 'last-write-wins':
    default: {
      const clientNewer = mutation.createdAt > serverVersion;
      return {
        apply: clientNewer,
        reason: clientNewer
          ? 'last-write-wins: istemci daha yeni'
          : 'last-write-wins: server daha yeni',
      };
    }
  }
}

/** Offline kuyruğu sync et — conflict çözerek uygula. */
export function syncOfflineQueue(strategy: SyncConflictStrategy = 'last-write-wins'): SyncResult {
  const pending = getPendingMutations();
  const applied: string[] = [];
  const conflicts: SyncResult['conflicts'] = [];

  for (const mutation of pending) {
    const { apply, reason } = resolveConflict(mutation, strategy);
    if (apply) {
      applied.push(mutation.id);
    } else {
      conflicts.push({ mutationId: mutation.id, resolved: strategy, reason });
    }
  }

  // Uygulanan + çözülen conflict'ler kuyruktan çıkar (conflict server'ı kabul etti)
  dequeueMutations([...applied, ...conflicts.map((c) => c.mutationId)]);
  g.__apexLastSyncAt = new Date().toISOString();

  return {
    applied: applied.length,
    conflicts,
    queueRemaining: getOfflineQueueLength(),
    syncedAt: g.__apexLastSyncAt,
  };
}

export function getLastSyncAt(): string | null {
  return g.__apexLastSyncAt ?? null;
}

export function getSyncQueueLength(): number {
  return getOfflineQueueLength();
}
