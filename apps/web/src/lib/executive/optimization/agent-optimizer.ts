import type { AgentPerformance, WorkflowPerformance, OptimizerRecommendation } from './types';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

// Agent & Workflow Optimizer — mevcut agent-store metrics + workflow runtime
// stats REUSE eder. Executive optimize ÖNERİSİ üretir; gerçek ayar yapmaz.

/** Agent performansı — başarı/süre/bekleme/hata/approval bekleme. */
export function getAgentPerformance(): AgentPerformance {
  const store = getAgentStore();
  const metrics = store.getMetrics();
  const all = store.getAll(200);

  const terminal = all.filter((a) => a.state === 'COMPLETED' || a.state === 'FAILED');
  const errorRate =
    terminal.length > 0 ? Math.round((metrics.byState.FAILED / terminal.length) * 100) : 0;

  const withApprovalWait = all.filter((a) => a.metrics.approvalWaitMs > 0);
  const avgApprovalWaitMs =
    withApprovalWait.length > 0
      ? Math.round(
          withApprovalWait.reduce((s, a) => s + a.metrics.approvalWaitMs, 0) /
            withApprovalWait.length,
        )
      : 0;

  // Bottleneck: en çok agent hangi durumda bekliyor
  let bottleneck: string | null = null;
  const waiting =
    metrics.byState.WAITING_APPROVAL + metrics.byState.WAITING_EVENT + metrics.byState.RETRYING;
  if (metrics.byState.WAITING_APPROVAL > 0 && metrics.byState.WAITING_APPROVAL >= waiting / 2) {
    bottleneck = 'approval-bekleme';
  } else if (metrics.byState.RETRYING > 0) {
    bottleneck = 'retry-döngüsü';
  } else if (errorRate > 30) {
    bottleneck = 'yüksek-hata-oranı';
  }

  return {
    total: metrics.total,
    successRate: metrics.successRate,
    avgRuntimeMs: metrics.averageRuntimeMs,
    avgApprovalWaitMs,
    errorRate,
    waitingApproval: metrics.byState.WAITING_APPROVAL,
    bottleneck,
  };
}

/** Workflow performansı — hata oranı, en yavaş, gereksiz/tekrar adımlar. */
export function getWorkflowPerformance(): WorkflowPerformance {
  const runtime = getWorkflowRuntime();
  const stats = runtime.getStats();
  const history = runtime.getHistory(undefined, 200);

  const failureRate =
    history.length > 0
      ? Math.round((history.filter((e) => e.phase === 'failed').length / history.length) * 100)
      : 0;

  // En yavaş workflow — ortalama süreye göre
  const durationByWf = new Map<string, { name: string; total: number; count: number }>();
  for (const e of history) {
    if (e.durationMs === undefined) continue;
    const cur = durationByWf.get(e.workflowId) ?? { name: e.workflowName, total: 0, count: 0 };
    cur.total += e.durationMs;
    cur.count += 1;
    durationByWf.set(e.workflowId, cur);
  }
  let slowestWorkflow: WorkflowPerformance['slowestWorkflow'] = null;
  for (const [id, d] of durationByWf) {
    const avg = Math.round(d.total / d.count);
    if (!slowestWorkflow || avg > slowestWorkflow.avgDurationMs) {
      slowestWorkflow = { id, name: d.name, avgDurationMs: avg };
    }
  }

  // Gereksiz/tekrar adımlar — aynı workflow'da tekrarlanan node tipleri
  const redundantSteps: WorkflowPerformance['redundantSteps'] = [];
  for (const wf of runtime.listWorkflows()) {
    const typeCounts = new Map<string, number>();
    for (const node of wf.nodes) {
      typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
    }
    for (const [type, count] of typeCounts) {
      if (count >= 3) {
        redundantSteps.push({
          workflow: wf.name,
          step: type,
          reason: `${count} kez tekrarlanan '${type}' adımı — tek adımda birleştirilebilir.`,
        });
      }
    }
  }

  // Otomasyon önerileri — sık başarısız veya manuel tetiklenen
  const automationSuggestions: string[] = [];
  if (failureRate > 20) automationSuggestions.push('Sık başarısız adımlara retry/backoff ekle.');
  if (stats.enabledWorkflows < stats.totalWorkflows) {
    automationSuggestions.push(
      `${stats.totalWorkflows - stats.enabledWorkflows} pasif workflow var — gözden geçir veya sil.`,
    );
  }
  if (slowestWorkflow && slowestWorkflow.avgDurationMs > 5000) {
    automationSuggestions.push(
      `'${slowestWorkflow.name}' yavaş (${slowestWorkflow.avgDurationMs}ms) — paralel adımlara böl.`,
    );
  }

  return {
    totalWorkflows: stats.totalWorkflows,
    enabledWorkflows: stats.enabledWorkflows,
    totalExecutions: stats.totalExecutions,
    failureRate,
    slowestWorkflow,
    redundantSteps: redundantSteps.slice(0, 10),
    automationSuggestions,
  };
}

/** Executive önerileri — agent + workflow optimizasyonu (yalnız öneri). */
export function getAgentWorkflowRecommendations(): OptimizerRecommendation[] {
  const agent = getAgentPerformance();
  const workflow = getWorkflowPerformance();
  const recs: OptimizerRecommendation[] = [];
  const now = new Date().toISOString();

  if (agent.bottleneck) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'agent',
      action: 'Agent darboğazını çöz',
      target: agent.bottleneck,
      rationale: `Başarı %${agent.successRate}, hata %${agent.errorRate}, ${agent.waitingApproval} agent onay bekliyor.`,
      impact: agent.errorRate > 30 ? 'high' : 'medium',
      requiresApproval: false,
      metrics: {
        successRate: agent.successRate,
        errorRate: agent.errorRate,
        avgRuntimeMs: agent.avgRuntimeMs,
        avgApprovalWaitMs: agent.avgApprovalWaitMs,
      },
      generatedAt: now,
    });
  }

  if (workflow.slowestWorkflow && workflow.slowestWorkflow.avgDurationMs > 5000) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'workflow',
      action: "Yavaş workflow'u optimize et",
      target: workflow.slowestWorkflow.name,
      rationale: `Ortalama ${workflow.slowestWorkflow.avgDurationMs}ms — paralel adımlara bölünebilir.`,
      impact: 'medium',
      requiresApproval: false,
      metrics: {
        avgDurationMs: workflow.slowestWorkflow.avgDurationMs,
        failureRate: workflow.failureRate,
      },
      generatedAt: now,
    });
  }

  for (const r of workflow.redundantSteps.slice(0, 3)) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'workflow',
      action: 'Tekrar eden adımı birleştir',
      target: r.workflow,
      rationale: r.reason,
      impact: 'low',
      requiresApproval: false,
      metrics: { step: r.step },
      generatedAt: now,
    });
  }

  return recs;
}
