import type { WearableView } from './types';
import { buildHomeDashboard, buildApprovalCenter } from './mobile-runtime';
import { getExecutiveDashboard } from '@/lib/ai/executive';
import { voiceStatus } from '@/lib/voice/services/voice-ai-service';
import { getNotifications } from './notification-center';

// Wearable Provider — Apple Watch / Wear OS. Executive/Trading/Approval/Tasks/
// Voice/Notifications kompakt görünüm. Mevcut servisleri reuse eder.

export async function buildWearableView(): Promise<WearableView> {
  const [dashboard, executive] = await Promise.all([
    buildHomeDashboard(),
    getExecutiveDashboard().catch(() => null),
  ]);

  const approvals = buildApprovalCenter();
  const voice = voiceStatus();
  const notifications = getNotifications(5).map((n) => ({ title: n.title, category: n.category }));

  return {
    executive: {
      focus: dashboard.executiveSummary.focus,
      riskScore: dashboard.executiveSummary.riskScore,
    },
    trading: {
      equity: dashboard.trading.equity,
      todayPnl: dashboard.trading.todayPnl,
    },
    tasks: {
      pending: executive?.goalPriority.length ?? 0,
      dueToday: executive?.topRisks.filter((r) => r.category === 'deadline').length ?? 0,
    },
    approvals: approvals.length,
    voiceReady: voice.active || voice.state === 'sleeping',
    notifications,
    generatedAt: new Date().toISOString(),
  };
}
