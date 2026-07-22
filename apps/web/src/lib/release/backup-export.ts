import type { ExportPackage, ImportResult } from './types';
import { APEX_VERSION } from './version-manager';
import { getMemoryStore } from '@/lib/memory/store';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { featureFlags } from '@apex-os/config';
import { getConfigSnapshot } from './config-manager';
import { getJournal } from '@/lib/quant/live/trade-journal';
import { getQueueMetrics } from '@/lib/commerce/intelligence/product-queue';
import { listPlugins } from '@/lib/plugins/plugin-registry';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

// Backup / Export — GERÇEK export/import tek paket. Settings/Memory/Knowledge/
// Commerce/Trading/Workflow/Plugins mevcut store'lardan serialize edilir (mock
// YOK). Import checksum doğrular. cloud-backup version history'den bağımsız —
// bu tam veri paketi (taşınabilir).

/** Deterministik checksum — export bütünlüğü doğrulaması. */
export function computeChecksum(payload: string): string {
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (h * 31 + payload.charCodeAt(i)) | 0;
  }
  return `apex-${(h >>> 0).toString(16)}-${payload.length}`;
}

/** Tüm APEX verisini tek pakete export et — gerçek store'lardan. */
export function exportPackage(): ExportPackage {
  const memory = getMemoryStore();
  const kg = getKnowledgeGraph();

  const settings = {
    featureFlags: Object.fromEntries(Object.entries(featureFlags).map(([k, v]) => [k, v.enabled])),
    config: getConfigSnapshot().featureFlags,
  };

  const memoryData = {
    timeline: memory.getTimeline(undefined, undefined, 1000),
    decisions: memory.getDecisions(undefined, 500),
  };

  const knowledge = {
    nodes: kg.getAllNodes(5000, 0),
    edges: kg.getAllEdges(5000, 0),
  };

  const trading = { journal: getJournal(500) };
  const commerce = { queue: getQueueMetrics() };
  const plugins = listPlugins();
  const workflow = { stats: getWorkflowRuntime().getStats() };

  const domains: ExportPackage['domains'] = {
    settings,
    memory: memoryData,
    knowledge,
    commerce,
    trading,
    plugins,
    workflow,
  };

  const itemCount =
    memoryData.timeline.length +
    memoryData.decisions.length +
    knowledge.nodes.length +
    knowledge.edges.length +
    trading.journal.length +
    plugins.length;

  const serialized = JSON.stringify(domains);
  const checksum = computeChecksum(serialized);

  return {
    version: APEX_VERSION,
    exportedAt: new Date().toISOString(),
    domains,
    checksum,
    itemCount,
  };
}

/** Export paketini doğrula (checksum) — import öncesi bütünlük kontrolü. */
export function verifyPackage(pkg: ExportPackage): ImportResult {
  const serialized = JSON.stringify(pkg.domains);
  const checksumValid = computeChecksum(serialized) === pkg.checksum;
  const domainsImported = Object.keys(pkg.domains);

  return {
    ok: checksumValid,
    version: pkg.version,
    checksumValid,
    domainsImported,
    itemCount: pkg.itemCount,
    message: checksumValid
      ? `Paket doğrulandı — v${pkg.version}, ${pkg.itemCount} kayıt, ${domainsImported.length} domain.`
      : 'Checksum uyuşmuyor — paket bozulmuş veya değiştirilmiş.',
  };
}
