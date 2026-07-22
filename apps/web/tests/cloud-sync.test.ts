import { describe, it, expect } from 'vitest';
import {
  pushDelta,
  pullDeltas,
  getSyncLag,
  getDeltaLog,
  runCloudSync,
} from '../src/lib/cloud/sync-engine';
import {
  enqueueCloudMutation,
  processOfflineQueue,
  getCloudQueueLength,
  clearCloudQueue,
  contentHash,
} from '../src/lib/cloud/offline-queue';
import {
  getConflicts,
  resolveManual,
  strategyForDomain,
  getConflictQueueLength,
} from '../src/lib/cloud/conflict-resolver';

describe('Sync Engine v2 — delta sync', () => {
  it('push delta versiyon artırır', () => {
    const key = `task-${Date.now()}`;
    const r1 = pushDelta({
      domain: 'tasks',
      key,
      operation: 'create',
      payload: { title: 'a' },
      deviceId: 'dev-a',
    });
    const r2 = pushDelta({
      domain: 'tasks',
      key,
      operation: 'update',
      payload: { title: 'b' },
      deviceId: 'dev-a',
      baseVersion: r1.delta!.version,
    });
    expect(r1.delta!.version).toBe(1);
    expect(r2.delta!.version).toBe(2);
    expect(r1.conflictId).toBeNull();
  });

  it('incremental pull — cihaz yalnız görmediği deltaları alır (delta sync)', () => {
    const puller = `puller-${Date.now()}`;
    const key = `note-${Date.now()}`;
    pushDelta({
      domain: 'projects',
      key,
      operation: 'create',
      payload: { name: 'p1' },
      deviceId: 'writer-1',
    });

    const first = pullDeltas(puller);
    expect(first.deltas.length).toBeGreaterThan(0);

    const second = pullDeltas(puller);
    expect(second.deltas.length).toBe(0); // cursor ilerledi — tekrar taşınmaz

    pushDelta({
      domain: 'projects',
      key,
      operation: 'update',
      payload: { name: 'p2' },
      deviceId: 'writer-1',
      baseVersion: 1,
    });
    const third = pullDeltas(puller);
    expect(third.deltas.length).toBe(1); // yalnız yeni delta
  });

  it('cihaz kendi yazdığı deltayı çekmez', () => {
    const dev = `self-${Date.now()}`;
    pullDeltas(dev); // cursor sıfırla
    pushDelta({
      domain: 'notifications',
      key: `n-${Date.now()}`,
      operation: 'create',
      payload: {},
      deviceId: dev,
    });
    const { deltas } = pullDeltas(dev);
    expect(deltas.every((d) => d.deviceId !== dev)).toBe(true);
  });

  it('sync lag görülmemiş delta sayısını verir', () => {
    const dev = `lag-${Date.now()}`;
    pullDeltas(dev);
    pushDelta({
      domain: 'agents',
      key: `a-${Date.now()}`,
      operation: 'create',
      payload: {},
      deviceId: 'other-dev',
    });
    expect(getSyncLag(dev)).toBeGreaterThanOrEqual(1);
  });

  it('domain filtresi delta log', () => {
    pushDelta({
      domain: 'plugins',
      key: `pl-${Date.now()}`,
      operation: 'create',
      payload: {},
      deviceId: 'x',
    });
    const log = getDeltaLog(10, 'plugins');
    expect(log.every((d) => d.domain === 'plugins')).toBe(true);
  });
});

describe('Conflict Resolution — LWW/merge/manual', () => {
  it("strateji domain'e göre: kritik manual, settings merge, tasks LWW", () => {
    expect(strategyForDomain('trading')).toBe('manual-review');
    expect(strategyForDomain('commerce')).toBe('manual-review');
    expect(strategyForDomain('executive')).toBe('manual-review');
    expect(strategyForDomain('settings')).toBe('merge');
    expect(strategyForDomain('tasks')).toBe('last-write-wins');
  });

  it('LWW conflict: eski baseVersion + farklı cihaz → son yazan kazanır', () => {
    const key = `lww-${Date.now()}`;
    pushDelta({ domain: 'tasks', key, operation: 'create', payload: { v: 1 }, deviceId: 'dev-a' });
    pushDelta({
      domain: 'tasks',
      key,
      operation: 'update',
      payload: { v: 2 },
      deviceId: 'dev-b',
      baseVersion: 1,
    });
    // dev-a hâlâ version 1 üstünde yazıyor → conflict
    const r = pushDelta({
      domain: 'tasks',
      key,
      operation: 'update',
      payload: { v: 3 },
      deviceId: 'dev-a',
      baseVersion: 1,
    });
    expect(r.conflictId).not.toBeNull();
    expect(r.delta).not.toBeNull(); // otomatik çözüldü (LWW)
  });

  it('merge domain: alanlar birleşir', () => {
    const key = `merge-${Date.now()}`;
    pushDelta({
      domain: 'settings',
      key,
      operation: 'create',
      payload: { theme: 'dark' },
      deviceId: 'dev-a',
    });
    pushDelta({
      domain: 'settings',
      key,
      operation: 'update',
      payload: { locale: 'tr' },
      deviceId: 'dev-b',
      baseVersion: 1,
    });
    const r = pushDelta({
      domain: 'settings',
      key,
      operation: 'update',
      payload: { fontSize: 14 },
      deviceId: 'dev-a',
      baseVersion: 1,
    });
    expect(r.conflictId).not.toBeNull();
    expect(r.delta).not.toBeNull();
    const conflict = getConflicts(undefined, 5).find((c) => c.id === r.conflictId);
    expect(conflict!.resolution).toBe('merged');
    expect(conflict!.mergedPayload).toHaveProperty('fontSize');
    expect(conflict!.mergedPayload).toHaveProperty('locale');
  });

  it('kritik domain (trading) → manual review, delta uygulanmaz', () => {
    const key = `crit-${Date.now()}`;
    pushDelta({
      domain: 'trading',
      key,
      operation: 'create',
      payload: { qty: 1 },
      deviceId: 'dev-a',
    });
    pushDelta({
      domain: 'trading',
      key,
      operation: 'update',
      payload: { qty: 2 },
      deviceId: 'dev-b',
      baseVersion: 1,
    });
    const r = pushDelta({
      domain: 'trading',
      key,
      operation: 'update',
      payload: { qty: 9 },
      deviceId: 'dev-a',
      baseVersion: 1,
    });
    expect(r.delta).toBeNull(); // ASLA otomatik ezilmez
    expect(r.conflictId).not.toBeNull();
    expect(getConflictQueueLength()).toBeGreaterThanOrEqual(1);

    const resolved = resolveManual(r.conflictId!, 'local');
    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolution).toBe('local');
  });
});

describe('Offline Queue — retry/backoff/dedup', () => {
  it('duplicate prevention: aynı içerik ikinci kez giremez', () => {
    clearCloudQueue();
    const input = {
      domain: 'tasks' as const,
      key: 'dup-1',
      operation: 'create' as const,
      payload: { t: 'x' },
      deviceId: 'd1',
    };
    const r1 = enqueueCloudMutation(input);
    const r2 = enqueueCloudMutation(input);
    expect(r1.duplicate).toBe(false);
    expect(r2.duplicate).toBe(true);
    expect(r2.item.id).toBe(r1.item.id);
    expect(getCloudQueueLength()).toBe(1);
  });

  it('contentHash deterministik', () => {
    const h1 = contentHash('tasks', 'k', 'create', { a: 1 });
    const h2 = contentHash('tasks', 'k', 'create', { a: 1 });
    const h3 = contentHash('tasks', 'k', 'create', { a: 2 });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('başarısız işlem backoff ile kuyrukta kalır, MAX sonrası düşer', () => {
    clearCloudQueue();
    enqueueCloudMutation({
      domain: 'memory',
      key: 'fail-1',
      operation: 'create',
      payload: { x: 1 },
      deviceId: 'd2',
    });

    // Hep hata fırlatan apply → retry
    const r1 = processOfflineQueue(() => {
      throw new Error('ağ yok');
    });
    expect(r1.retried).toBe(1);
    expect(getCloudQueueLength()).toBe(1); // backoff ile bekliyor

    // Backoff süresi dolmadan tekrar işlenmez
    const r2 = processOfflineQueue(() => {
      throw new Error('ağ yok');
    });
    expect(r2.applied + r2.retried + r2.dropped).toBe(0);
  });

  it('ağ gelince sırayla uygulanır', () => {
    clearCloudQueue();
    enqueueCloudMutation({
      domain: 'tasks',
      key: 'ok-1',
      operation: 'create',
      payload: { t: 1 },
      deviceId: 'd3',
    });
    enqueueCloudMutation({
      domain: 'tasks',
      key: 'ok-2',
      operation: 'create',
      payload: { t: 2 },
      deviceId: 'd3',
    });
    const r = processOfflineQueue(() => ({ applied: true, manualReview: false }));
    expect(r.applied).toBe(2);
    expect(getCloudQueueLength()).toBe(0);
  });
});

describe('runCloudSync — tam döngü (mobile queue reuse)', () => {
  it('offline + mobile kuyruk + pull tek sonuçta', () => {
    clearCloudQueue();
    enqueueCloudMutation({
      domain: 'projects',
      key: `full-${Date.now()}`,
      operation: 'create',
      payload: { p: 1 },
      deviceId: 'full-dev',
    });
    const result = runCloudSync('full-dev');
    expect(result.offlineApplied).toBe(1);
    expect(result).toHaveProperty('mobileQueueApplied');
    expect(result).toHaveProperty('queueRemaining');
    expect(result.syncedAt).toBeTruthy();
  });
});
