import type { LiveTradingAlert, LiveAlertKind } from './types';
import { routeNotification } from '@/lib/cloud/notification-router';

// Live Alerts — pozisyon/TP/SL/trailing/risk/margin/likidasyon bildirimleri.
// Ring buffer. Mobil push notification-center bu alert'leri tüketir.
// Critical alert'ler Cloud Notification Router ile saate+telefona yönlenir (Sprint 22).

const MAX_ALERTS = 200;
const g = globalThis as unknown as { __apexLiveAlerts?: LiveTradingAlert[] };

function store(): LiveTradingAlert[] {
  if (!g.__apexLiveAlerts) g.__apexLiveAlerts = [];
  return g.__apexLiveAlerts;
}

const SEVERITY: Record<LiveAlertKind, LiveTradingAlert['severity']> = {
  position_opened: 'info',
  tp_hit: 'info',
  sl_hit: 'warning',
  trailing_update: 'info',
  risk_warning: 'warning',
  margin_call: 'critical',
  liquidation_risk: 'critical',
};

export function raiseAlert(kind: LiveAlertKind, symbol: string, message: string): LiveTradingAlert {
  const alert: LiveTradingAlert = {
    id: crypto.randomUUID(),
    kind,
    symbol,
    message,
    severity: SEVERITY[kind],
    createdAt: new Date().toISOString(),
  };
  const s = store();
  s.push(alert);
  if (s.length > MAX_ALERTS) s.shift();

  // Critical risk → Notification Router (saat + telefon) — Sprint 22
  if (alert.severity === 'critical') {
    routeNotification({
      category: 'risk',
      severity: 'critical',
      title: `${symbol}: ${kind}`,
      body: message,
    });
  }
  return alert;
}

export function getLiveAlerts(limit = 30, kind?: LiveAlertKind): LiveTradingAlert[] {
  let items = [...store()].reverse();
  if (kind) items = items.filter((a) => a.kind === kind);
  return items.slice(0, limit);
}
