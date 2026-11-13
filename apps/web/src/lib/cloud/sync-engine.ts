import type { SyncDelta, SyncDomain, SyncOperation, SyncCursor, CloudSyncResult } from './types';
import { resolveConflict } from './conflict-resolver';
import { syncOfflineQueue, getLastSyncAt } from '@/lib/mobile/sync-client';
import { processOfflineQueue, getCloudQueueLength } from './offline-queue';

// Sync Engine v2 — delta sync: yalnız değişen veri taşınır. Domain:key başına
// versiyon sayacı + global sequence; cihaz cursor'ı incremental pull yapar.
// Mevcut mobile sync-client (offline mutation merge) REUSE edilir.

const MAX_DELTAS = 1000;

const g = globalThis as unknown as {
  __apexCloudDeltas?: SyncDelta[];
  __apexCloudVersions?: Map<string, number>; // domain:key → son versiyon
  __apexCloudCursors?: Map<string, SyncCursor>; // deviceId → cursor
  __apexCloudSeq?: number; // global delta sequence
};

function deltas(): SyncDelta[] {
  if (!g.__apexCloudDeltas) g.__apexCloudDeltas = [];
  return g.__apexCloudDeltas;
}

function versions(): Map<string, number> {
  if (!g.__apexCloudVersions) g.__apexCloudVersions = new Map();
  return g.__apexCloudVersions;
}

function cursors(): Map<string, SyncCursor> {
  if (!g.__apexCloudCursors) g.__apexCloudCursors = new Map();
  return g.__apexCloudCursors;
}

function nextSeq(): number {
  g.__apexCloudSeq = (g.__apexCloudSeq ?? 0) + 1;
  return g.__apexCloudSeq;
}

export interface PushDeltaInput {
  domain: SyncDomain;
  key: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  deviceId: string;
  baseVersion?: number; // istemcinin gördüğü son versiyon
}

/**
 * Delta push — conflict tespiti: istemcinin baseVersion'ı server versiyonundan
 * eskiyse başka cihaz aynı kaydı değiştirmiş demektir → conflict-resolver.
 */
export function pushDelta(input: PushDeltaInput): {
  delta: SyncDelta | null;
  conflictId: string | null;
} {
  const vkey = `${input.domain}:${input.key}`;
  const serverVersion = versions().get(vkey) ?? 0;
  const baseVersion = input.baseVersion ?? serverVersion;

  const incoming: SyncDelta = {
    id: crypto.randomUUID(),
    domain: input.domain,
    key: input.key,
    operation: input.operation,
    payload: input.payload,
    deviceId: input.deviceId,
    version: serverVersion + 1,
    baseVersion,
    createdAt: new Date().toISOString(),
  };

  // Concurrent write: istemci eski versiyon üstüne yazıyor + son yazan farklı cihaz
  if (baseVersion < serverVersion) {
    const lastRemote = [...deltas()]
      .reverse()
      .find(
        (d) => d.domain === input.domain && d.key === input.key && d.deviceId !== input.deviceId,
      );
    if (lastRemote) {
      const { conflict, winner } = resolveConflict(incoming, lastRemote);
      if (!winner) return { delta: null, conflictId: conflict.id }; // manual-review beklemede
      const applied = appendDelta({ ...winner, version: serverVersion + 1 });
      return { delta: applied, conflictId: conflict.id };
    }
  }

  return { delta: appendDelta(incoming), conflictId: null };
}

function appendDelta(delta: SyncDelta): SyncDelta {
  const seq = nextSeq();
  const d = deltas();
  d.push(delta);
  if (d.length > MAX_DELTAS) d.shift();
  versions().set(`${delta.domain}:${delta.key}`, delta.version);
  seqIndex().set(delta.id, seq); // delta.id → global seq (incremental pull)
  return delta;
}

// delta.id → global seq (incremental pull için)
const gs = globalThis as unknown as { __apexCloudSeqIndex?: Map<string, number> };
function seqIndex(): Map<string, number> {
  if (!gs.__apexCloudSeqIndex) gs.__apexCloudSeqIndex = new Map();
  return gs.__apexCloudSeqIndex;
}

/** Incremental pull — cihaz yalnız görmediği deltaları alır (delta sync). */
export function pullDeltas(
  deviceId: string,
  domains?: SyncDomain[],
): { deltas: SyncDelta[]; cursor: SyncCursor } {
  const cursor = cursors().get(deviceId) ?? {
    deviceId,
    lastDeltaSeq: 0,
    syncedAt: new Date(0).toISOString(),
  };
  const fresh = deltas().filter((d) => {
    const seq = seqIndex().get(d.id) ?? 0;
    if (seq <= cursor.lastDeltaSeq) return false;
    if (d.deviceId === deviceId) return false; // kendi yazdığını çekmez
    if (domains && !domains.includes(d.domain)) return false;
    return true;
  });

  const maxSeq = fresh.reduce(
    (max, d) => Math.max(max, seqIndex().get(d.id) ?? 0),
    cursor.lastDeltaSeq,
  );
  const updated: SyncCursor = {
    deviceId,
    lastDeltaSeq: maxSeq,
    syncedAt: new Date().toISOString(),
  };
  cursors().set(deviceId, updated);

  return { deltas: fresh, cursor: updated };
}

/** Cihazın sync gecikmesi — görülmemiş delta sayısı (device intelligence besler). */
export function getSyncLag(deviceId: string): number {
  const cursor = cursors().get(deviceId);
  if (!cursor) return deltas().length;
  return deltas().filter(
    (d) => (seqIndex().get(d.id) ?? 0) > cursor.lastDeltaSeq && d.deviceId !== deviceId,
  ).length;
}

export function getSyncCursor(deviceId: string): SyncCursor | null {
  return cursors().get(deviceId) ?? null;
}

export function getDeltaLog(limit = 50, domain?: SyncDomain): SyncDelta[] {
  let items = [...deltas()].reverse();
  if (domain) items = items.filter((d) => d.domain === domain);
  return items.slice(0, limit);
}

export function getSyncQueueLength(): number {
  return deltas().length;
}

/**
 * Tam sync döngüsü: cloud offline kuyruğu işle (retry/backoff) + mobile offline
 * mutation kuyruğunu merge et (Sprint 18 reuse) + cihaz cursor'ını ilerlet.
 */
export function runCloudSync(deviceId: string): CloudSyncResult {
  const offline = processOfflineQueue((item) => {
    const result = pushDelta({
      domain: item.domain,
      key: item.key,
      operation: item.operation,
      payload: item.payload,
      deviceId: item.deviceId,
    });
    return {
      applied: result.delta !== null,
      manualReview: result.conflictId !== null && result.delta === null,
    };
  });
  const mobile = syncOfflineQueue('last-write-wins');
  const { deltas: pulled } = pullDeltas(deviceId);

  return {
    pushed: offline.applied,
    pulled: pulled.length,
    conflicts: offline.conflicts + mobile.conflicts.length,
    offlineApplied: offline.applied,
    mobileQueueApplied: mobile.applied,
    queueRemaining: getCloudQueueLength() + mobile.queueRemaining,
    syncedAt: new Date().toISOString(),
  };
}

export function getCloudLastSyncAt(): string | null {
  const cursorTimes = [...cursors().values()]
    .map((c) => c.syncedAt)
    .sort()
    .reverse();
  return cursorTimes[0] ?? getLastSyncAt();
}
