import type { BackupSnapshot, BackupDomain } from './types';
import { getMemoryStore } from '@/lib/memory/store';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { getRegistryMetrics } from '@/lib/plugins/plugin-registry';
import { featureFlags } from '@apex-os/config';
import { getSnapshot } from '@/lib/mobile/offline-store';

// Cloud Backup — Memory/Knowledge/Tasks/Projects/Plugins/Settings version
// history ile yedeklenir. Item sayıları GERÇEK store'lardan okunur (Memory
// stats, KG statistics, plugin registry, feature flags, offline snapshot).

const MAX_BACKUPS = 20;

const g = globalThis as unknown as {
  __apexCloudBackups?: BackupSnapshot[];
  __apexBackupVersion?: number;
};

function store(): BackupSnapshot[] {
  if (!g.__apexCloudBackups) g.__apexCloudBackups = [];
  return g.__apexCloudBackups;
}

const ALL_DOMAINS: BackupDomain[] = [
  'memory',
  'knowledge',
  'tasks',
  'projects',
  'plugins',
  'settings',
];

/** Gerçek item sayıları — mevcut store'lardan. */
function collectItemCounts(): Record<BackupDomain, number> {
  const memoryStats = getMemoryStore().getStats();
  const kgStats = getKnowledgeGraph().getStatistics();
  const pluginMetrics = getRegistryMetrics();
  const offline = getSnapshot();

  return {
    memory: memoryStats.timelineEntries + memoryStats.decisions + memoryStats.journals,
    knowledge: kgStats.nodeCount + kgStats.edgeCount,
    tasks: offline?.tasks.length ?? 0,
    projects: offline?.projects.length ?? memoryStats.projects,
    plugins: pluginMetrics.total,
    settings: Object.keys(featureFlags).length,
  };
}

/** Yedek oluştur — version monoton artar (version history). */
export function createBackup(deviceId: string, domains?: BackupDomain[]): BackupSnapshot {
  const selected = domains && domains.length > 0 ? domains : ALL_DOMAINS;
  const allCounts = collectItemCounts();
  const itemCounts = Object.fromEntries(
    ALL_DOMAINS.map((d) => [d, selected.includes(d) ? allCounts[d] : 0]),
  ) as Record<BackupDomain, number>;

  g.__apexBackupVersion = (g.__apexBackupVersion ?? 0) + 1;
  const totalItems = Object.values(itemCounts).reduce((a, b) => a + b, 0);

  const snapshot: BackupSnapshot = {
    id: crypto.randomUUID(),
    version: g.__apexBackupVersion,
    domains: selected,
    itemCounts,
    sizeBytes: totalItems * 512, // ortalama kayıt boyutu tahmini (metadata)
    deviceId,
    createdAt: new Date().toISOString(),
  };
  const s = store();
  s.push(snapshot);
  if (s.length > MAX_BACKUPS) s.shift();
  return snapshot;
}

/** Version history — en yeni önce. */
export function listBackups(limit = 20): BackupSnapshot[] {
  return [...store()].reverse().slice(0, limit);
}

export function getBackup(version: number): BackupSnapshot | null {
  return store().find((b) => b.version === version) ?? null;
}

export function getLatestBackup(): BackupSnapshot | null {
  const s = store();
  return s[s.length - 1] ?? null;
}

/** Restore bilgisi — hangi domain'lerden kaç kayıt döneceği (istemci uygular). */
export function getRestorePlan(
  version: number,
): { snapshot: BackupSnapshot; totalItems: number } | null {
  const snapshot = getBackup(version);
  if (!snapshot) return null;
  return {
    snapshot,
    totalItems: Object.values(snapshot.itemCounts).reduce((a, b) => a + b, 0),
  };
}
