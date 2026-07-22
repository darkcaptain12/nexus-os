import type { MobileSystemHealth } from './types';
import { getDevices, getWatchDevices } from './device-registry';
import { getPushStats } from './notification-center';
import { getOfflineQueueLength } from './offline-store';
import { getSyncQueueLength, getLastSyncAt } from './sync-client';
import { buildHomeDashboard } from './mobile-runtime';
import { cacheSnapshot } from './offline-store';
import type { OfflineSnapshot } from './types';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';

// Background Service — event-driven arka plan senkronizasyonu. İstemci
// BackgroundTasks/WorkManager tetikler; server poll YAPMAZ. Offline snapshot'ı
// tazeler, sistem sağlığını raporlar.

/** Arka plan sync tetiği — offline cache tazele (istemci schedule eder). */
export async function runBackgroundSync(): Promise<{ refreshed: boolean; cachedAt: string }> {
  const dashboard = await buildHomeDashboard();
  const graph = getKnowledgeGraph().getStatistics();
  const snapshot: OfflineSnapshot = {
    executive: dashboard.executiveSummary,
    tasks: [],
    projects: [],
    trading: null,
    commerce: dashboard.commerce,
    memorySummary: { health: graph.memoryHealth, entries: graph.nodeCount },
    cachedAt: dashboard.generatedAt,
  };
  cacheSnapshot(snapshot);
  return { refreshed: true, cachedAt: dashboard.generatedAt };
}

/** System Dashboard: Mobile Health — bağlı cihazlar, batarya, push, kuyruklar. */
export function getMobileSystemHealth(): MobileSystemHealth {
  const devices = getDevices();
  const push = getPushStats();
  const watches = getWatchDevices();

  return {
    connectedDevices: devices.filter((d) => d.online).length,
    devices: devices.map((d) => ({
      platform: d.platform,
      name: d.name,
      online: d.online,
      battery: d.batteryLevel,
    })),
    pushQueueLength: push.queueLength,
    pushDeliveredTotal: push.deliveredTotal,
    offlineQueueLength: getOfflineQueueLength(),
    syncQueueLength: getSyncQueueLength(),
    watchConnected: watches.some((w) => w.online),
    lastSyncAt: getLastSyncAt(),
    eventDriven: true,
    generatedAt: new Date().toISOString(),
  };
}
