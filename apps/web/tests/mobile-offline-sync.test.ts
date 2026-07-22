import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheSnapshot,
  getSnapshot,
  enqueueMutation,
  getPendingMutations,
  getOfflineQueueLength,
  clearOffline,
} from '../src/lib/mobile/offline-store';
import {
  syncOfflineQueue,
  recordServerVersion,
  getSyncQueueLength,
  getLastSyncAt,
} from '../src/lib/mobile/sync-client';
import type { OfflineSnapshot } from '../src/lib/mobile/types';

function makeSnapshot(): OfflineSnapshot {
  return {
    executive: null,
    tasks: [{ title: 'Görev A', status: 'pending' }],
    projects: [{ name: 'Proje X', progress: 40 }],
    trading: null,
    commerce: null,
    memorySummary: { health: 70, entries: 100 },
    cachedAt: new Date().toISOString(),
  };
}

describe('Offline Store', () => {
  beforeEach(() => clearOffline());

  it('snapshot cache + geri okuma', () => {
    const snap = makeSnapshot();
    cacheSnapshot(snap);
    expect(getSnapshot()!.memorySummary.health).toBe(70);
  });

  it('mutation kuyruğa eklenir', () => {
    const m = enqueueMutation({
      entity: 'tasks',
      action: 'complete',
      payload: { id: 't1' },
      deviceId: crypto.randomUUID(),
    });
    expect(m.id).toBeTruthy();
    expect(getOfflineQueueLength()).toBe(1);
  });

  it('getPendingMutations bekleyenleri döner', () => {
    enqueueMutation({
      entity: 'trading',
      action: 'note',
      payload: {},
      deviceId: crypto.randomUUID(),
    });
    expect(getPendingMutations().length).toBeGreaterThan(0);
  });

  it('clearOffline temizler', () => {
    enqueueMutation({ entity: 'tasks', action: 'x', payload: {}, deviceId: crypto.randomUUID() });
    clearOffline();
    expect(getOfflineQueueLength()).toBe(0);
    expect(getSnapshot()).toBeNull();
  });
});

describe('Sync Client — conflict resolution', () => {
  beforeEach(() => clearOffline());

  it('server versiyonu yoksa mutation uygulanır', () => {
    enqueueMutation({
      entity: 'tasks',
      action: 'complete',
      payload: { id: 'new-1' },
      deviceId: crypto.randomUUID(),
    });
    const result = syncOfflineQueue('last-write-wins');
    expect(result.applied).toBe(1);
    expect(result.queueRemaining).toBe(0);
  });

  it('server-wins: server versiyonu varsa çakışma', () => {
    recordServerVersion('tasks', 'conf-1', new Date().toISOString());
    enqueueMutation({
      entity: 'tasks',
      action: 'update',
      payload: { id: 'conf-1' },
      deviceId: crypto.randomUUID(),
    });
    const result = syncOfflineQueue('server-wins');
    expect(result.applied).toBe(0);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0]!.reason).toContain('server-wins');
  });

  it('last-write-wins: istemci daha yeniyse uygulanır', () => {
    recordServerVersion('projects', 'lww-1', new Date(Date.now() - 60000).toISOString());
    enqueueMutation({
      entity: 'projects',
      action: 'update',
      payload: { id: 'lww-1' },
      deviceId: crypto.randomUUID(),
    });
    const result = syncOfflineQueue('last-write-wins');
    expect(result.applied).toBe(1);
  });

  it('client-wins: her zaman istemci', () => {
    recordServerVersion('commerce', 'cw-1', new Date(Date.now() + 60000).toISOString());
    enqueueMutation({
      entity: 'commerce',
      action: 'update',
      payload: { id: 'cw-1' },
      deviceId: crypto.randomUUID(),
    });
    const result = syncOfflineQueue('client-wins');
    expect(result.applied).toBe(1);
  });

  it('sync sonrası kuyruk boşalır + lastSyncAt set', () => {
    enqueueMutation({
      entity: 'memory',
      action: 'x',
      payload: { id: 'm1' },
      deviceId: crypto.randomUUID(),
    });
    syncOfflineQueue();
    expect(getSyncQueueLength()).toBe(0);
    expect(getLastSyncAt()).toBeTruthy();
  });
});
