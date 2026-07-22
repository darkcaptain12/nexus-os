import type { ReleaseAuditReport, SubsystemCheck } from './types';
import { getExecutiveDashboard } from '@/lib/ai/executive';
import { getMemoryStore } from '@/lib/memory/store';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { commerceDashboard } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';
import { voiceStatus } from '@/lib/voice/services/voice-ai-service';
import { cloudStatus } from '@/lib/cloud/services/cloud-service';
import { getRegistryMetrics } from '@/lib/plugins/plugin-registry';

// Release Audit — tam entegrasyon doğrulaması. Her subsystem instantiate olup
// gerçek veri dönüyor mu (integration smoke test). Yeni kod YAZMAZ — mevcut
// servisleri çağırıp çalıştıklarını doğrular.

export async function runReleaseAudit(): Promise<ReleaseAuditReport> {
  const subsystems: SubsystemCheck[] = [];

  async function probe(
    name: string,
    fn: () => unknown | Promise<unknown>,
    describe: (r: unknown) => string,
  ): Promise<void> {
    try {
      const result = await fn();
      subsystems.push({ name, status: 'pass', integrated: true, detail: describe(result) });
    } catch (err) {
      subsystems.push({
        name,
        status: 'fail',
        integrated: false,
        detail: err instanceof Error ? err.message : 'başlatılamadı',
      });
    }
  }

  await probe(
    'Executive',
    () => getExecutiveDashboard(),
    () => 'Executive dashboard hazır',
  );
  await probe(
    'Memory',
    () => getMemoryStore().getStats(),
    (r) => `${(r as { timelineEntries: number }).timelineEntries} timeline kaydı`,
  );
  await probe(
    'Knowledge Graph',
    () => getKnowledgeGraph().getStatistics(),
    (r) => `${(r as { nodeCount: number }).nodeCount} node`,
  );
  await probe(
    'Agent Runtime',
    () => getAgentStore().getMetrics(),
    (r) =>
      `${(r as { total: number }).total} agent, %${(r as { successRate: number }).successRate} başarı`,
  );
  await probe(
    'Trading',
    () => getJournalStats(),
    (r) => `${(r as { total: number }).total} işlem`,
  );
  await probe(
    'Commerce',
    () => commerceDashboard(),
    () => 'Commerce intelligence hazır',
  );
  await probe(
    'Voice',
    () => voiceStatus(),
    () => 'Voice intent parser hazır',
  );
  await probe(
    'Cloud',
    () => cloudStatus(),
    (r) => `${(r as { totalDevices: number }).totalDevices} cihaz`,
  );
  await probe(
    'Plugin',
    () => getRegistryMetrics(),
    (r) => `${(r as { total: number }).total} plugin`,
  );

  const integratedCount = subsystems.filter((s) => s.integrated).length;
  const status: ReleaseAuditReport['status'] =
    integratedCount === subsystems.length
      ? 'pass'
      : integratedCount >= subsystems.length * 0.8
        ? 'warn'
        : 'fail';

  return {
    status,
    integratedCount,
    totalSubsystems: subsystems.length,
    subsystems,
    generatedAt: new Date().toISOString(),
  };
}
