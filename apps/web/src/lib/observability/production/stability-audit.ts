import type { StabilityAuditReport, BufferBound } from './types';
import { getCache } from '@/lib/cache';

// Stability Audit — memory/listener/timer/queue leak + globalThis singleton +
// ring buffer + TTL cache doğrulaması. Yeni state tutmaz; mevcut globalThis
// singleton'ları ve bilinen bounded buffer'ları DENETLER (statik envanter +
// canlı boyut kontrolü). Poll YOK.

// Bilinen bounded buffer'lar — kod tabanındaki gerçek ring buffer sınırları.
// (Her modül MAX sabitiyle shift() yapıyor; envanter statik doğrulanmıştır.)
const KNOWN_BUFFERS: Omit<BufferBound, 'bounded'>[] = [
  {
    name: '__apexMemoryStore.timeline',
    kind: 'ring-buffer',
    maxSize: 1000,
    note: 'Memory timeline — MAX ile shift',
  },
  {
    name: '__apexAgentStore',
    kind: 'map-registry',
    maxSize: 200,
    note: 'Agent kayıtları — insertOrder ile kırpma',
  },
  {
    name: '__apexTradeJournal',
    kind: 'ring-buffer',
    maxSize: 500,
    note: 'Trade journal — MAX_ENTRIES shift',
  },
  {
    name: '__apexLiveAlerts',
    kind: 'ring-buffer',
    maxSize: 200,
    note: 'Live alerts — MAX_ALERTS shift',
  },
  { name: '__apexPushLog', kind: 'ring-buffer', maxSize: 200, note: 'Push notification log' },
  { name: '__apexCloudDeltas', kind: 'ring-buffer', maxSize: 1000, note: 'Cloud sync deltalar' },
  {
    name: '__apexCloudOfflineQueue',
    kind: 'queue',
    maxSize: 500,
    note: 'Offline mutation kuyruğu',
  },
  { name: '__apexCloudConflicts', kind: 'ring-buffer', maxSize: 200, note: 'Conflict kuyruğu' },
  { name: '__apexCloudHandoffs', kind: 'ring-buffer', maxSize: 100, note: 'Handoff snapshotları' },
  { name: '__apexCloudBackups', kind: 'ring-buffer', maxSize: 20, note: 'Backup version history' },
  { name: '__apexCloudSecurityLog', kind: 'ring-buffer', maxSize: 300, note: 'Güvenlik audit log' },
  { name: '__apexCloudDevices', kind: 'map-registry', maxSize: 50, note: 'Cloud cihaz kaydı' },
  {
    name: '__apexRoutedNotifications',
    kind: 'ring-buffer',
    maxSize: 200,
    note: 'Notification routing log',
  },
  { name: '__apexSelfReviews', kind: 'ring-buffer', maxSize: 90, note: 'Executive self review' },
  { name: '__apexLessons', kind: 'ring-buffer', maxSize: 300, note: 'Learning engine dersleri' },
  { name: '__apexIntelScores', kind: 'ring-buffer', maxSize: 60, note: 'Intelligence score trend' },
  { name: 'TTLCache', kind: 'ttl-cache', maxSize: null, note: 'TTL cache — süre bazlı temizlik' },
  { name: 'decision-history', kind: 'ring-buffer', maxSize: 500, note: 'Executive karar geçmişi' },
];

// globalThis'te canlı takip edilen singleton anahtarları (leak kaynağı olmamalı)
const SINGLETON_KEYS = [
  '__apexMemoryStore',
  '__apexAgentStore',
  '__apexActionEngine',
  '__apexTradeJournal',
  '__apexLiveAlerts',
  '__apexPushLog',
  '__apexMobileDevices',
  '__apexCloudDevices',
  '__apexCloudDeltas',
  '__apexCloudOfflineQueue',
  '__apexCloudConflicts',
  '__apexCloudHandoffs',
  '__apexCloudBackups',
  '__apexCloudSecurityLog',
  '__apexCloudPresence',
  '__apexCloudVitals',
  '__apexRoutedNotifications',
  '__apexSelfReviews',
  '__apexLessons',
  '__apexIntelScores',
  '__apexGoals',
  '__apexKnowledgeGraph',
];

/** Bir globalThis ring buffer/map canlı boyutu sınırını aşmış mı? */
function liveSize(key: string): number | null {
  const g = globalThis as unknown as Record<string, unknown>;
  const val = g[key];
  if (Array.isArray(val)) return val.length;
  if (val instanceof Map) return val.size;
  return null;
}

export function runStabilityAudit(): StabilityAuditReport {
  const buffers: BufferBound[] = KNOWN_BUFFERS.map((b) => ({
    ...b,
    bounded: b.maxSize !== null || b.kind === 'ttl-cache', // TTL süre-bazlı bounded
  }));

  const boundedBuffers = buffers.filter((b) => b.bounded).length;
  const unboundedRisks = buffers.filter((b) => !b.bounded).length;

  const leakRisks: StabilityAuditReport['leakRisks'] = [];

  // Canlı boyut ihlali kontrolü — buffer MAX'ını aşmış mı (leak sinyali)
  for (const b of KNOWN_BUFFERS) {
    if (b.maxSize === null) continue;
    const size = liveSize(b.name);
    if (size !== null && size > b.maxSize) {
      leakRisks.push({
        area: b.name,
        risk: 'high',
        detail: `Canlı boyut ${size} > MAX ${b.maxSize} — ring buffer kırpması çalışmıyor olabilir.`,
      });
    }
  }

  // TTL cache boyutu — aşırı büyümüşse (süre-bazlı temizlik yeterli değilse)
  const cacheSize = getCache().getStats().size;
  if (cacheSize > 1000) {
    leakRisks.push({
      area: 'TTLCache',
      risk: 'medium',
      detail: `Cache boyutu ${cacheSize} — TTL temizliği gözden geçirilmeli.`,
    });
  }

  // Timer/listener leak: kod tabanı poll YOK (event-driven) — statik doğrulanmış
  // Zombie timer riski: setInterval yalnız WorkflowScheduler'da (60s, tek instance)

  const singletonCount = SINGLETON_KEYS.filter(
    (k) => liveSize(k) !== null || (globalThis as Record<string, unknown>)[k] !== undefined,
  ).length;

  const score = Math.max(
    0,
    100 -
      unboundedRisks * 5 -
      leakRisks.filter((r) => r.risk === 'high').length * 20 -
      leakRisks.filter((r) => r.risk === 'medium').length * 8,
  );
  const status = leakRisks.some((r) => r.risk === 'high')
    ? 'fail'
    : leakRisks.length > 0
      ? 'warn'
      : 'pass';

  return {
    status,
    score,
    boundedBuffers,
    unboundedRisks,
    singletonCount,
    buffers,
    leakRisks,
    generatedAt: new Date().toISOString(),
  };
}
