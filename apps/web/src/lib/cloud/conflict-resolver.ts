import type { SyncConflict, SyncDelta, SyncDomain, ConflictStrategy } from './types';

// Conflict Resolution — Last Write Wins (varsayılan), Merge (uygun tipler),
// Manual Review (kritik veriler: trading/commerce/executive). Manuel kuyruk
// ring buffer; kritik veri asla otomatik ezilmez.

const MAX_CONFLICTS = 200;

const g = globalThis as unknown as { __apexCloudConflicts?: SyncConflict[] };

function store(): SyncConflict[] {
  if (!g.__apexCloudConflicts) g.__apexCloudConflicts = [];
  return g.__apexCloudConflicts;
}

/** Domain'e göre strateji: kritik → manual, mergeable → merge, kalan → LWW. */
const MANUAL_REVIEW_DOMAINS: SyncDomain[] = ['trading', 'commerce', 'executive'];
const MERGE_DOMAINS: SyncDomain[] = ['settings', 'memory', 'notifications'];

export function strategyForDomain(domain: SyncDomain): ConflictStrategy {
  if (MANUAL_REVIEW_DOMAINS.includes(domain)) return 'manual-review';
  if (MERGE_DOMAINS.includes(domain)) return 'merge';
  return 'last-write-wins';
}

/** Object-level merge: remote taban, local'in çakışmayan/daha yeni alanları üstüne. */
function mergePayloads(local: SyncDelta, remote: SyncDelta): Record<string, unknown> {
  const base = { ...remote.payload };
  for (const [k, v] of Object.entries(local.payload)) {
    if (!(k in base)) {
      base[k] = v;
    } else if (local.createdAt > remote.createdAt) {
      base[k] = v; // aynı alan — daha yeni yazan kazanır (alan bazında LWW)
    }
  }
  return base;
}

/**
 * Conflict çöz — stratejiye göre otomatik veya manuel kuyruğa.
 * Dönen `winner` uygulanacak deltadır; manual-review'da null (beklemede).
 */
export function resolveConflict(
  local: SyncDelta,
  remote: SyncDelta,
): {
  conflict: SyncConflict;
  winner: SyncDelta | null;
} {
  const strategy = strategyForDomain(local.domain);
  const now = new Date().toISOString();

  const conflict: SyncConflict = {
    id: crypto.randomUUID(),
    domain: local.domain,
    key: local.key,
    local,
    remote,
    strategy,
    status: strategy === 'manual-review' ? 'manual-review' : 'auto-resolved',
    detectedAt: now,
  };

  let winner: SyncDelta | null = null;

  if (strategy === 'last-write-wins') {
    winner = local.createdAt > remote.createdAt ? local : remote;
    conflict.resolution = winner === local ? 'local' : 'remote';
    conflict.resolvedAt = now;
  } else if (strategy === 'merge') {
    const merged = mergePayloads(local, remote);
    conflict.mergedPayload = merged;
    conflict.resolution = 'merged';
    conflict.resolvedAt = now;
    winner = { ...local, payload: merged };
  }
  // manual-review: winner null — kuyrukta bekler, resolveManual ile çözülür

  const s = store();
  s.push(conflict);
  if (s.length > MAX_CONFLICTS) s.shift();

  return { conflict, winner };
}

/** Manuel çözüm — kullanıcı local/remote seçer (kritik veri son kontrolü). */
export function resolveManual(conflictId: string, choice: 'local' | 'remote'): SyncConflict | null {
  const conflict = store().find((c) => c.id === conflictId);
  if (!conflict || conflict.status !== 'manual-review') return null;
  conflict.status = 'resolved';
  conflict.resolution = choice;
  conflict.resolvedAt = new Date().toISOString();
  return conflict;
}

export function getConflicts(status?: SyncConflict['status'], limit = 50): SyncConflict[] {
  let items = [...store()].reverse();
  if (status) items = items.filter((c) => c.status === status);
  return items.slice(0, limit);
}

export function getConflictQueueLength(): number {
  return store().filter((c) => c.status === 'manual-review').length;
}
