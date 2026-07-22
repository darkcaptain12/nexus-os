import type { ProductionAlert, AlertKind } from './types';
import { getMetrics } from '@/lib/observability';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getApprovalQueue } from '@/lib/ai/approval-queue';
import { getCloudQueueLength } from '@/lib/cloud/offline-queue';
import { getConflictQueueLength } from '@/lib/cloud/conflict-resolver';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { routeNotification } from '@/lib/cloud/notification-router';

// Alert Engine — kritik production olayları (crash/memory/queue/trading/commerce/
// sync/database/event-loop). MEVCUT notification altyapısını REUSE eder
// (routeNotification → Discord/Telegram/Email sağlayıcı + saat/telefon). Yeni
// bildirim sistemi YAZILMAZ. Ring buffer.

const MAX_ALERTS = 200;
const g = globalThis as unknown as { __apexProductionAlerts?: ProductionAlert[] };

function store(): ProductionAlert[] {
  if (!g.__apexProductionAlerts) g.__apexProductionAlerts = [];
  return g.__apexProductionAlerts;
}

interface Threshold {
  kind: AlertKind;
  check: () => {
    breached: boolean;
    severity: 'warning' | 'critical';
    message: string;
    value: number | string;
    threshold: number | string;
  } | null;
}

const HEAP_WARN_MB = 512;
const HEAP_CRIT_MB = 900;
const EVENT_LOOP_CRIT_MS = 100;
const QUEUE_WARN = 100;
const CONFLICT_CRIT = 20;

const THRESHOLDS: Threshold[] = [
  {
    kind: 'memory',
    check: () => {
      const heapMB = Math.round(
        getMetrics().getProcessMetrics().memory.heapUsedBytes / (1024 * 1024),
      );
      if (heapMB >= HEAP_CRIT_MB)
        return {
          breached: true,
          severity: 'critical',
          message: `Heap kullanımı kritik: ${heapMB}MB`,
          value: heapMB,
          threshold: HEAP_CRIT_MB,
        };
      if (heapMB >= HEAP_WARN_MB)
        return {
          breached: true,
          severity: 'warning',
          message: `Heap kullanımı yüksek: ${heapMB}MB`,
          value: heapMB,
          threshold: HEAP_WARN_MB,
        };
      return null;
    },
  },
  {
    kind: 'event-loop',
    check: () => {
      const p99 = getMetrics().getProcessMetrics().eventLoopDelayMs?.p99 ?? 0;
      if (p99 >= EVENT_LOOP_CRIT_MS)
        return {
          breached: true,
          severity: 'critical',
          message: `Event loop gecikmesi kritik: ${p99}ms p99`,
          value: p99,
          threshold: EVENT_LOOP_CRIT_MS,
        };
      return null;
    },
  },
  {
    kind: 'queue',
    check: () => {
      const pending = getApprovalQueue().getPending().length;
      if (pending >= QUEUE_WARN)
        return {
          breached: true,
          severity: 'warning',
          message: `Onay kuyruğu birikti: ${pending} bekleyen`,
          value: pending,
          threshold: QUEUE_WARN,
        };
      return null;
    },
  },
  {
    kind: 'sync',
    check: () => {
      const conflicts = getConflictQueueLength();
      const offline = getCloudQueueLength();
      if (conflicts >= CONFLICT_CRIT)
        return {
          breached: true,
          severity: 'critical',
          message: `Manuel conflict birikti: ${conflicts}`,
          value: conflicts,
          threshold: CONFLICT_CRIT,
        };
      if (offline >= QUEUE_WARN)
        return {
          breached: true,
          severity: 'warning',
          message: `Offline sync kuyruğu: ${offline}`,
          value: offline,
          threshold: QUEUE_WARN,
        };
      return null;
    },
  },
  {
    kind: 'trading',
    check: () => {
      const stats = getJournalStats();
      if (stats.total >= 5 && stats.winRate < 30)
        return {
          breached: true,
          severity: 'warning',
          message: `Trading win rate düşük: %${stats.winRate}`,
          value: stats.winRate,
          threshold: 30,
        };
      return null;
    },
  },
  {
    kind: 'crash',
    check: () => {
      const failed = getAgentStore().getMetrics().byState.FAILED;
      if (failed >= 5)
        return {
          breached: true,
          severity: 'warning',
          message: `${failed} agent başarısız (crash sinyali)`,
          value: failed,
          threshold: 5,
        };
      return null;
    },
  },
];

/** Eşikleri kontrol et — ihlalleri alert olarak kaydet + kritikleri notification'a yönlendir. */
export function evaluateAlerts(): ProductionAlert[] {
  const fired: ProductionAlert[] = [];

  for (const t of THRESHOLDS) {
    const result = t.check();
    if (!result || !result.breached) continue;

    // Kritik → mevcut notification altyapısına yönlendir (routeNotification reuse)
    let routed = false;
    if (result.severity === 'critical') {
      routeNotification({
        category: 'risk',
        severity: 'critical',
        title: `Production Alert: ${t.kind}`,
        body: result.message,
      });
      routed = true;
    }

    const alert: ProductionAlert = {
      id: crypto.randomUUID(),
      kind: t.kind,
      severity: result.severity,
      message: result.message,
      value: result.value,
      threshold: result.threshold,
      routed,
      at: new Date().toISOString(),
    };
    fired.push(alert);
  }

  const s = store();
  s.push(...fired);
  if (s.length > MAX_ALERTS) s.splice(0, s.length - MAX_ALERTS);
  return fired;
}

export function getAlerts(limit = 50, severity?: 'warning' | 'critical'): ProductionAlert[] {
  let items = [...store()].reverse();
  if (severity) items = items.filter((a) => a.severity === severity);
  return items.slice(0, limit);
}

export function getActiveAlertCount(): number {
  // Son 5 dakikadaki alert'ler aktif sayılır
  const cutoff = Date.now() - 5 * 60_000;
  return store().filter((a) => new Date(a.at).getTime() > cutoff).length;
}
