import type {
  MobileHomeDashboard,
  MobileApprovalItem,
  MobileTradingView,
  DesktopCompanion,
  OfflineSnapshot,
} from './types';
import { getExecutiveDashboard } from '@/lib/ai/executive';
import { getStateMachine } from '@/lib/ai/orchestrator/state-machine';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getApprovalQueue } from '@/lib/ai/approval-queue';
import { getActionEngine } from '@/lib/actions/engine-instance';
import { getDesktopIntelligenceContext } from '@/lib/desktop-vision/services/desktop-vision-service';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { getTradingStatusSummary, getPortfolioOverview } from '@/lib/quant/services/quant-service';
import { getCommerceOverview } from '@/lib/commerce/commerce-service';
import { cacheSnapshot } from './offline-store';

// Mobile Runtime — FACADE. Mevcut servisleri aggregate eder, yeni iş mantığı YOK.
// Her kaynak try/catch ile sarılır (offline-first: bir servis düşse de dashboard döner).

/** Home Dashboard: Executive + Plan + Trading + Commerce + Agent + Desktop + Memory. */
export async function buildHomeDashboard(): Promise<MobileHomeDashboard> {
  const now = new Date().toISOString();

  const [executive, trading, commerce] = await Promise.all([
    getExecutiveDashboard().catch(() => null),
    getTradingStatusSummary().catch(() => null),
    getCommerceOverview().catch(() => null),
  ]);

  const agentMetrics = getAgentStore().getMetrics();
  const desktop = getDesktopIntelligenceContext();
  const memoryHealth = getKnowledgeGraph().getStatistics().memoryHealth;
  let cycleState = 'IDLE';
  try {
    cycleState = getStateMachine().getState();
  } catch {
    // orchestrator hazır değil
  }

  const dashboard: MobileHomeDashboard = {
    executiveSummary: {
      focus: executive?.focusRecommendation ?? 'Executive hazırlanıyor',
      riskScore: executive?.riskScore ?? 0,
      recommendationCount: executive?.decisions.length ?? 0,
      cycleState,
    },
    dailyPlan: {
      greeting: 'Günaydın Emir',
      date: new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      taskCount: executive?.goalPriority.length ?? 0,
      goalCount: executive?.goalPriority.length ?? 0,
    },
    trading: {
      equity: trading?.equity ?? 0,
      todayPnl: trading?.todayPnl ?? 0,
      openPositions: trading?.openPositionCount ?? 0,
    },
    commerce: {
      totalOrders: commerce?.metrics.totalOrders ?? 0,
      pendingOrders: commerce?.metrics.pendingOrders ?? 0,
      revenue: commerce?.metrics.revenue ?? 0,
      alerts: commerce?.alerts.length ?? 0,
    },
    agents: {
      total: agentMetrics.total,
      running: agentMetrics.byState.RUNNING,
      waitingApproval: agentMetrics.byState.WAITING_APPROVAL,
      successRate: agentMetrics.successRate,
    },
    desktop: {
      activeApp: desktop.window?.activeApp ?? null,
      activeProject: desktop.activeProject,
      online: desktop.window !== null,
    },
    memoryHealth,
    generatedAt: now,
  };

  // Offline-first: her build offline cache'i tazeler
  const snapshot: OfflineSnapshot = {
    executive: dashboard.executiveSummary,
    tasks: [],
    projects: (executive?.goalPriority ?? [])
      .slice(0, 10)
      .map((g) => ({ name: g.title, progress: g.progress })),
    trading: null,
    commerce: dashboard.commerce,
    memorySummary: { health: memoryHealth, entries: getKnowledgeGraph().getStatistics().nodeCount },
    cachedAt: now,
  };
  cacheSnapshot(snapshot);

  return dashboard;
}

/** Approval Center: AI Approval Queue + Action Engine onayları tek listede. */
export function buildApprovalCenter(): MobileApprovalItem[] {
  const items: MobileApprovalItem[] = [];

  for (const item of getApprovalQueue().getPending()) {
    items.push({
      id: item.id,
      source: 'ai',
      category: categorizeApproval(item.title),
      title: item.title,
      description: item.description,
      reasoning: item.reasoning,
      createdAt: item.createdAt,
    });
  }

  for (const exec of getActionEngine().approvals.getPending()) {
    items.push({
      id: exec.id,
      source: 'action-engine',
      category: categorizeApproval(exec.actionName),
      title: exec.actionName,
      description: exec.description,
      reasoning: exec.reason ?? `Risk seviyesi: ${exec.riskLevel}`,
      createdAt: exec.createdAt,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function categorizeApproval(title: string): MobileApprovalItem['category'] {
  const t = title.toLocaleLowerCase('tr');
  if (/trade|emir|pozisyon|btc|eth|al |sat /.test(t)) return 'trading';
  if (/sipariş|ürün|order|product|reklam/.test(t)) return 'commerce';
  if (/workflow|iş akış/.test(t)) return 'workflow';
  if (/agent|ajan/.test(t)) return 'agent';
  return 'approval';
}

/** Trading Mobile: canlı portföy (paper). */
export async function buildTradingView(): Promise<MobileTradingView> {
  const portfolio = await getPortfolioOverview().catch(() => null);
  if (!portfolio) {
    return {
      equity: 0,
      balance: 0,
      todayPnl: 0,
      unrealizedPnl: 0,
      openPositions: [],
      mode: 'paper',
    };
  }
  return {
    equity: portfolio.equity,
    balance: portfolio.balance,
    todayPnl: portfolio.todayPnl,
    unrealizedPnl: portfolio.unrealizedPnl,
    openPositions: portfolio.openPositions.map((p) => ({
      symbol: p.symbol,
      direction: p.direction,
      pnl: p.pnl,
    })),
    mode: 'paper',
  };
}

/** Desktop Companion: evdeki PC durumu (Desktop Intelligence reuse). */
export function buildDesktopCompanion(): DesktopCompanion {
  const ctx = getDesktopIntelligenceContext();
  const w = ctx.window;
  return {
    online: w !== null,
    activeApp: w?.activeApp ?? null,
    activeProject: ctx.activeProject,
    ide: w?.ide
      ? {
          name: w.ide.ideName,
          file: w.ide.activeFile,
          language: w.ide.language,
          branch: w.ide.gitBranch,
        }
      : null,
    lastClipboardKind: ctx.recentClipboard[0]?.kind ?? null,
    lastOcrKind: ctx.recentOcr[0]?.contentKind ?? null,
    updatedAt: ctx.generatedAt,
  };
}
