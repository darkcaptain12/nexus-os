import type { CloudDeviceType, RoutedNotification } from './types';
import { getCloudDevices } from './device-manager';
import { getPresence } from './presence-engine';
import { pushNotification, type PushInput } from '@/lib/mobile/notification-center';

// Notification Routing — bildirim doğru cihaza gider. Kural tablosu:
// trading approval → telefon; critical risk → saat; desktop event → Mac/Windows.
// Push event üretimi mevcut notification-center REUSE (yeniden yazma yok).

const MAX_ROUTED = 200;

const g = globalThis as unknown as { __apexRoutedNotifications?: RoutedNotification[] };

function log(): RoutedNotification[] {
  if (!g.__apexRoutedNotifications) g.__apexRoutedNotifications = [];
  return g.__apexRoutedNotifications;
}

interface RouteRule {
  match: (input: PushInput) => boolean;
  targets: CloudDeviceType[];
  reason: string;
}

/** Kural sırası önemli — ilk eşleşen kazanır. */
const ROUTE_RULES: RouteRule[] = [
  {
    match: (n) => n.severity === 'critical' && n.category === 'risk',
    targets: ['apple-watch', 'wear-os', 'iphone', 'android'],
    reason: 'critical risk → saat + telefon',
  },
  {
    match: (n) => n.requiresApproval === true,
    targets: ['iphone', 'android'],
    reason: 'approval → telefon',
  },
  {
    match: (n) => n.category === 'trading',
    targets: ['iphone', 'android', 'ipad'],
    reason: 'trading → telefon/tablet',
  },
  {
    match: (n) => n.category === 'desktop',
    targets: ['mac', 'windows'],
    reason: 'desktop event → masaüstü',
  },
  {
    match: (n) => n.severity === 'critical',
    targets: ['apple-watch', 'wear-os', 'iphone', 'android'],
    reason: 'critical → saat + telefon',
  },
];

/**
 * Bildirimi yönlendir — kural tablosundan hedef cihaz tipleri seçilir,
 * yalnız online + aktif cihazlara gider. Hedef tipte online cihaz yoksa
 * tüm online cihazlara fallback (bildirim kaybolmaz).
 */
export function routeNotification(input: PushInput): RoutedNotification {
  const notification = pushNotification(input); // mevcut push engine reuse

  const rule = ROUTE_RULES.find((r) => r.match(input));
  const targetTypes = rule?.targets ?? null;

  const activeOnline = getCloudDevices('active').filter((d) => {
    const status = getPresence(d.id).status;
    return status !== 'offline';
  });

  let routed = targetTypes
    ? activeOnline.filter((d) => targetTypes.includes(d.type))
    : activeOnline;
  let reason = rule?.reason ?? 'genel → tüm online cihazlar';
  if (routed.length === 0 && activeOnline.length > 0) {
    routed = activeOnline; // fallback — hedef tipte online cihaz yok
    reason = `${reason} (fallback: hedef tip offline)`;
  }

  const entry: RoutedNotification = {
    notificationId: notification.id,
    category: input.category,
    severity: input.severity ?? 'info',
    routedTo: routed.map((d) => ({ deviceId: d.id, deviceType: d.type, reason })),
    createdAt: notification.createdAt,
  };
  const l = log();
  l.push(entry);
  if (l.length > MAX_ROUTED) l.shift();
  return entry;
}

export function getRoutedNotifications(limit = 30): RoutedNotification[] {
  return [...log()].reverse().slice(0, limit);
}
