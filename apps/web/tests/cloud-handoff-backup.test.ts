import { describe, it, expect } from 'vitest';
import {
  createHandoff,
  claimHandoff,
  getHandoffs,
  getPendingHandoffCount,
} from '../src/lib/cloud/handoff-engine';
import {
  createBackup,
  listBackups,
  getBackup,
  getRestorePlan,
} from '../src/lib/cloud/cloud-backup';
import { registerCloudDevice } from '../src/lib/cloud/device-manager';
import { cloudStatus, cloudWatchView, cloudHistory } from '../src/lib/cloud/services/cloud-service';
import {
  mobileCloudDevices,
  mobileCloudStatus,
  mobileCloudBackup,
} from '../src/lib/mobile/services/mobile-service';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';

describe('Handoff — session continuity', () => {
  it('voice handoff: Mac bırakır, iPhone devralır — context aynen taşınır', () => {
    const h = createHandoff({
      kind: 'voice',
      fromDeviceId: 'mac-dev-1',
      context: {
        conversationId: 'conv-42',
        lastIntent: 'trading.status',
        transcript: 'BTC durumu ne?',
      },
    });
    expect(h.state).toBe('pending');

    const claimed = claimHandoff('iphone-dev-1', 'voice');
    expect(claimed).not.toBeNull();
    expect(claimed!.id).toBe(h.id);
    expect(claimed!.toDeviceId).toBe('iphone-dev-1');
    expect(claimed!.context['conversationId']).toBe('conv-42');
    expect(claimed!.state).toBe('claimed');
  });

  it("kaynak cihaz kendi handoff'unu devralamaz", () => {
    createHandoff({ kind: 'agent', fromDeviceId: 'self-dev', context: { agentId: 'a1' } });
    const claimed = claimHandoff('self-dev', 'agent');
    expect(claimed?.fromDeviceId ?? null).not.toBe('self-dev');
  });

  it('kind filtresi: yalnız istenen tür devralınır', () => {
    createHandoff({ kind: 'trading', fromDeviceId: 'mac-t', context: { symbol: 'ETHUSDT' } });
    const claimed = claimHandoff('phone-t', 'trading');
    expect(claimed!.kind).toBe('trading');
  });

  it('tüm continuity türleri desteklenir', () => {
    for (const kind of ['executive', 'workflow', 'commerce'] as const) {
      const h = createHandoff({ kind, fromDeviceId: 'src-x', context: { k: kind } });
      expect(h.kind).toBe(kind);
    }
    expect(getPendingHandoffCount()).toBeGreaterThanOrEqual(3);
    expect(getHandoffs('pending').length).toBeGreaterThanOrEqual(3);
  });

  it("handoff devri Knowledge Graph'a yazılır", () => {
    const graph = getKnowledgeGraph();
    const before = graph.getStatistics().nodeCount;
    createHandoff({ kind: 'voice', fromDeviceId: 'kg-src-dev', context: {} });
    claimHandoff('kg-dst-dev', 'voice');
    expect(graph.getStatistics().nodeCount).toBeGreaterThan(before);
  });
});

describe('Cloud Backup — version history + gerçek sayılar', () => {
  it('backup version monoton artar', () => {
    const b1 = createBackup('backup-dev');
    const b2 = createBackup('backup-dev');
    expect(b2.version).toBe(b1.version + 1);
  });

  it("item sayıları gerçek store'lardan okunur", () => {
    const b = createBackup('backup-dev');
    expect(b.itemCounts.knowledge).toBeGreaterThan(0); // KG'de node/edge var
    expect(b.domains).toContain('memory');
    expect(b.domains).toContain('settings');
    expect(b.itemCounts.settings).toBeGreaterThan(0); // feature flags
  });

  it('domain seçimi: seçilmeyen domain 0 sayılır', () => {
    const b = createBackup('backup-dev', ['memory', 'knowledge']);
    expect(b.domains).toEqual(['memory', 'knowledge']);
    expect(b.itemCounts.plugins).toBe(0);
    expect(b.itemCounts.tasks).toBe(0);
  });

  it('version history listelenir + restore planı döner', () => {
    const backups = listBackups();
    expect(backups.length).toBeGreaterThanOrEqual(3);
    const target = backups[0]!;
    expect(getBackup(target.version)!.id).toBe(target.id);
    const plan = getRestorePlan(target.version);
    expect(plan!.totalItems).toBeGreaterThanOrEqual(0);
    expect(getRestorePlan(99999)).toBeNull();
  });
});

describe('Cloud Service facade — düz JSON (mobil sözleşme)', () => {
  it('cloudStatus tüm dashboard alanlarını döner', () => {
    registerCloudDevice({
      name: `Status-${Date.now()}`,
      type: 'mac',
      platform: 'macOS',
      version: '1.0.0',
    });
    const s = cloudStatus();
    expect(s).toHaveProperty('connectedDevices');
    expect(s).toHaveProperty('syncQueueLength');
    expect(s).toHaveProperty('offlineQueueLength');
    expect(s).toHaveProperty('conflictQueueLength');
    expect(s).toHaveProperty('fleetHealthAvg');
    expect(s).toHaveProperty('pendingHandoffs');
    expect(s.totalDevices).toBeGreaterThan(0);
    expect(() => JSON.stringify(s)).not.toThrow();
  });

  it('cloudHistory sync+backup+security birleşik döner', () => {
    const h = cloudHistory(10);
    expect(h).toHaveProperty('sync');
    expect(h).toHaveProperty('backups');
    expect(h).toHaveProperty('security');
    expect(h.backups.length).toBeGreaterThan(0);
  });

  it('cloudWatchView Apple Watch sözleşmesi (Sprint 18 wearable reuse)', async () => {
    const w = await cloudWatchView();
    expect(w).toHaveProperty('connected');
    expect(w).toHaveProperty('lastSyncAt');
    expect(w).toHaveProperty('approvals');
    expect(w.trading).toHaveProperty('equity');
    expect(w.executive).toHaveProperty('focus');
    expect(() => JSON.stringify(w)).not.toThrow();
  });

  it('mobile facade cloud ekranları düz JSON döner', () => {
    expect(Array.isArray(mobileCloudDevices())).toBe(true);
    expect(mobileCloudStatus()).toHaveProperty('connectedDevices');
    expect(Array.isArray(mobileCloudBackup())).toBe(true);
  });
});

describe('Knowledge Graph — cihaz ilişkileri', () => {
  it('cihaz kaydı User→Device zinciri yazar', () => {
    const graph = getKnowledgeGraph();
    const before = graph.getStatistics().nodeCount;
    registerCloudDevice({
      name: `KG-Device-${Date.now()}`,
      type: 'iphone',
      platform: 'iOS 19',
      version: '1.0.0',
    });
    expect(graph.getStatistics().nodeCount).toBeGreaterThan(before);
  });
});
