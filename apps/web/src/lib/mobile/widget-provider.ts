import type { WidgetData, WidgetSize, DevicePlatform } from './types';
import { buildHomeDashboard } from './mobile-runtime';

// Widget Provider — iOS (Small/Medium/Large/Lock Screen) + Android (Material).
// Home dashboard verisini boyuta göre projekte eder. Framework-bağımsız JSON;
// istemci (WidgetKit / Glance) render eder.

export async function buildWidget(
  size: WidgetSize,
  platform: DevicePlatform = 'ios',
): Promise<WidgetData> {
  const d = await buildHomeDashboard();
  const now = new Date().toISOString();
  const pnlAccent = (v: number): 'up' | 'down' | 'neutral' =>
    v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';

  const allLines = [
    { label: 'Odak', value: d.executiveSummary.focus.slice(0, 40), accent: 'neutral' as const },
    { label: 'Risk', value: `${d.executiveSummary.riskScore}/100`, accent: 'neutral' as const },
    { label: 'Portföy', value: `${d.trading.equity} USDT`, accent: 'neutral' as const },
    {
      label: 'Günlük PnL',
      value: `${d.trading.todayPnl >= 0 ? '+' : ''}${d.trading.todayPnl}`,
      accent: pnlAccent(d.trading.todayPnl),
    },
    { label: 'Agent', value: `${d.agents.running} çalışıyor`, accent: 'neutral' as const },
    {
      label: 'Onay',
      value: `${d.agents.waitingApproval}`,
      accent: d.agents.waitingApproval > 0 ? ('down' as const) : ('neutral' as const),
    },
    { label: 'Sipariş', value: `${d.commerce.pendingOrders} bekleyen`, accent: 'neutral' as const },
    { label: 'Memory', value: `${d.memoryHealth}`, accent: 'neutral' as const },
  ];

  // Boyuta göre satır sayısı
  const lineCounts: Record<WidgetSize, number> = {
    'lock-screen': 1,
    small: 2,
    medium: 4,
    large: 8,
    material: 4,
  };

  return {
    size,
    platform,
    title: 'APEX OS',
    lines: allLines.slice(0, lineCounts[size]),
    updatedAt: now,
  };
}
