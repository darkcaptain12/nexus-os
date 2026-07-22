import type { PushNotification, PushCategory, PushSeverity } from './types';
import { getPushTokens, getDevices } from './device-registry';

// Push Notification Engine — gerçek event'ler (Trading/Commerce/Agent/Desktop/
// Memory/Workflow/Approval/Risk). Ring buffer. Event-driven: modüller push()
// çağırır, server poll yapmaz. Gerçek gönderim istemci push token'larına
// (APNs/FCM) — bu katman event'i oluşturur + hedef cihazları belirler.

const MAX_NOTIFICATIONS = 200;

const g = globalThis as unknown as {
  __apexPushLog?: PushNotification[];
  __apexPushDelivered?: number;
};

function log(): PushNotification[] {
  if (!g.__apexPushLog) g.__apexPushLog = [];
  return g.__apexPushLog;
}

export interface PushInput {
  category: PushCategory;
  severity?: PushSeverity;
  title: string;
  body: string;
  deepLink?: string;
  requiresApproval?: boolean;
}

/** Push event oluştur — online cihazlara hedeflenir (gerçek gönderim istemcide). */
export function pushNotification(input: PushInput): PushNotification {
  const tokens = getPushTokens();
  const notification: PushNotification = {
    id: crypto.randomUUID(),
    category: input.category,
    severity: input.severity ?? 'info',
    title: input.title,
    body: input.body,
    deepLink: input.deepLink,
    requiresApproval: input.requiresApproval ?? false,
    createdAt: new Date().toISOString(),
    deliveredTo: tokens,
  };
  const l = log();
  l.push(notification);
  if (l.length > MAX_NOTIFICATIONS) l.shift();
  g.__apexPushDelivered = (g.__apexPushDelivered ?? 0) + tokens.length;
  return notification;
}

export function getNotifications(limit = 30, category?: PushCategory): PushNotification[] {
  let items = [...log()].reverse();
  if (category) items = items.filter((n) => n.category === category);
  return items.slice(0, limit);
}

export function getPushStats(): {
  queueLength: number;
  deliveredTotal: number;
  onlineDevices: number;
} {
  return {
    queueLength: log().length,
    deliveredTotal: g.__apexPushDelivered ?? 0,
    onlineDevices: getDevices().filter((d) => d.online).length,
  };
}

export function clearNotifications(): void {
  g.__apexPushLog = [];
}
