import type { Goal, GoalProgress, GoalMetric, GoalPeriod } from './types';
import { getRealizedSummary } from '@/lib/quant/live/portfolio-intelligence';
import { getRevenueMetrics } from '@/lib/commerce/intelligence/revenue-intelligence';
import { getQueueMetrics } from '@/lib/commerce/intelligence/product-queue';
import { getAverageRoas } from '@/lib/commerce/intelligence/ad-optimizer';
import { getJournal } from '@/lib/quant/live/trade-journal';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';
import { deferPersist } from '@/lib/persist-after';
import { persistGoal } from '@/lib/persist-stores';

// Goal Engine — hedefler + ilerleme. Executive kararlarını bu hedeflere göre
// önceliklendirir. İlerleme GERÇEK verilerden okunur (trading realized PnL,
// commerce revenue, queue published, ad ROAS, agent success, workflow runs).

const g = globalThis as unknown as { __apexGoals?: Map<string, Goal> };

function store(): Map<string, Goal> {
  if (!g.__apexGoals) {
    g.__apexGoals = new Map();
    seedDefaultGoals(g.__apexGoals);
  }
  return g.__apexGoals;
}

// Spec'teki örnek hedefler — gerçek default'lar (kullanıcı değiştirebilir).
function seedDefaultGoals(map: Map<string, Goal>): void {
  const now = new Date().toISOString();
  const defaults: Omit<Goal, 'id' | 'createdAt'>[] = [
    { label: 'Bu ay 100.000 TL net kâr', metric: 'net_profit', target: 100_000, period: 'monthly' },
    {
      label: 'Haftada 10 ürün yayınla',
      metric: 'products_published',
      target: 10,
      period: 'weekly',
    },
    { label: 'Günlük 5 trading analizi', metric: 'trading_analyses', target: 5, period: 'daily' },
    { label: 'Reklam ROAS > 4', metric: 'roas', target: 4, period: 'daily' },
  ];
  for (const d of defaults) {
    const id = crypto.randomUUID();
    const goal = { ...d, id, createdAt: now };
    map.set(id, goal);
    deferPersist(() => persistGoal(goal)); // write-through (default hedefler kalıcı)
  }
}

export function setGoal(input: {
  label: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
}): Goal {
  const goal: Goal = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  store().set(goal.id, goal);
  deferPersist(() => persistGoal(goal)); // write-through
  return goal;
}

export function removeGoal(id: string): boolean {
  return store().delete(id);
}

export function getGoals(): Goal[] {
  return [...store().values()];
}

function periodStart(period: GoalPeriod): number {
  const now = new Date();
  if (period === 'daily') return new Date(now.toISOString().slice(0, 10)).getTime();
  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // pazartesi
    return new Date(d.toISOString().slice(0, 10)).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/** Metriğin dönem içindeki güncel değeri — gerçek store'lardan. */
async function currentValue(goal: Goal): Promise<number> {
  const since = periodStart(goal.period);
  switch (goal.metric) {
    case 'net_profit': {
      const trading = getRealizedSummary().realizedPnl;
      const commerce = await getRevenueMetrics()
        .then((r) => r.profit)
        .catch(() => 0);
      return Number((trading + commerce).toFixed(2));
    }
    case 'products_published':
      return getQueueMetrics().published ?? 0;
    case 'trading_analyses':
      return getJournal(200).filter((t) => new Date(t.openedAt).getTime() >= since).length;
    case 'roas':
      return getAverageRoas();
    case 'agent_success_rate':
      return getAgentStore().getMetrics().successRate;
    case 'workflow_completions': {
      const stats = getWorkflowRuntime().getStats();
      return stats.todayExecutions - stats.todayFailures;
    }
    default:
      return 0;
  }
}

function statusOf(
  percent: number,
  metric: GoalMetric,
  current: number,
  target: number,
): GoalProgress['status'] {
  if (current >= target) return 'achieved';
  // ROAS gibi eşik hedefleri: altındaysa risk
  if (metric === 'roas' && current < target * 0.5) return 'at-risk';
  if (percent >= 60) return 'on-track';
  if (percent >= 30) return 'behind';
  return 'at-risk';
}

export async function getGoalProgress(): Promise<GoalProgress[]> {
  const goals = getGoals();
  const results = await Promise.all(
    goals.map(async (goal) => {
      const current = await currentValue(goal);
      const percent = goal.target > 0 ? Math.round((current / goal.target) * 100) : 0;
      return {
        goal,
        current,
        target: goal.target,
        percent,
        status: statusOf(percent, goal.metric, current, goal.target),
        gap: Number(Math.max(0, goal.target - current).toFixed(2)),
      } satisfies GoalProgress;
    }),
  );
  return results;
}

/** Executive için: hedeflere göre öncelik sırası (en geride kalan en öncelikli). */
export async function getGoalPriorities(): Promise<GoalProgress[]> {
  const progress = await getGoalProgress();
  const rank: Record<GoalProgress['status'], number> = {
    'at-risk': 0,
    behind: 1,
    'on-track': 2,
    achieved: 3,
  };
  return [...progress].sort((a, b) => rank[a.status] - rank[b.status] || a.percent - b.percent);
}
