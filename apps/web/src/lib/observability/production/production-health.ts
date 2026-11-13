import type { ProductionHealth } from './types';
import { getMetrics } from '@/lib/observability';
import { getCache } from '@/lib/cache';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getApprovalQueue } from '@/lib/ai/approval-queue';
import { getSyncQueueLength } from '@/lib/cloud/sync-engine';
import { getConflictQueueLength } from '@/lib/cloud/conflict-resolver';
import { getLiveOrders } from '@/lib/quant/live/live-order-engine';
import { getRegistryMetrics } from '@/lib/plugins/plugin-registry';
import { cloudStatus } from '@/lib/cloud/services/cloud-service';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { getActiveAlertCount } from './alert-engine';

// Production Health — monitoring dashboard aggregate: CPU/RAM/Event Loop/Queue/
// Cache/Plugin/Cloud/Trading/Commerce/Voice. Mevcut metrics + store'lardan OKUR.

export function getProductionHealth(): ProductionHealth {
  const proc = getMetrics().getProcessMetrics();
  const cache = getCache().getStats();

  const memoryPercent =
    proc.memory.heapTotalBytes > 0
      ? Math.round((proc.memory.heapUsedBytes / proc.memory.heapTotalBytes) * 100)
      : 0;
  const eventLoopP99 = proc.eventLoopDelayMs?.p99 ?? null;

  const agentMetrics = getAgentStore().getMetrics();
  const queues = {
    agents: agentMetrics.byState.RUNNING + agentMetrics.byState.WAITING_APPROVAL,
    approvals: getApprovalQueue().getPending().length,
    cloudSync: getSyncQueueLength(),
    conflicts: getConflictQueueLength(),
    liveOrders: getLiveOrders().filter((o) => o.status === 'pending-approval').length,
  };

  const plugins = getRegistryMetrics();
  const cloud = cloudStatus();
  const journal = getJournalStats();
  const alerts = getActiveAlertCount();

  const subsystems: ProductionHealth['subsystems'] = [
    { name: 'Plugins', status: `${plugins.byState['enabled'] ?? 0} aktif / ${plugins.total}` },
    {
      name: 'Cloud',
      status: `${cloud.connectedDevices}/${cloud.totalDevices} cihaz, filo sağlık ${cloud.fleetHealthAvg}`,
    },
    {
      name: 'Trading',
      status: journal.total > 0 ? `${journal.total} işlem, win %${journal.winRate}` : 'işlem yok',
    },
    { name: 'Commerce', status: 'servis hazır' },
    { name: 'Voice', status: 'intent parser hazır' },
  ];

  // Genel durum — memory + event loop + conflict + alert
  const critical = memoryPercent >= 90 || (eventLoopP99 ?? 0) > 100 || queues.conflicts >= 20;
  const degraded =
    memoryPercent >= 75 || (eventLoopP99 ?? 0) > 50 || alerts > 0 || cache.hitRate < 40;
  const status: ProductionHealth['status'] = critical
    ? 'critical'
    : degraded
      ? 'degraded'
      : 'healthy';

  return {
    status,
    cpu: proc.cpuPercent,
    memoryPercent,
    eventLoopP99,
    queues,
    cacheHitRate: cache.hitRate,
    subsystems,
    alerts,
    generatedAt: new Date().toISOString(),
  };
}
