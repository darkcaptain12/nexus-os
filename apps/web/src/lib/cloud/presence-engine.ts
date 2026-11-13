import type { DevicePresence, PresenceStatus } from './types';
import { getCloudDevices } from './device-manager';

// Presence Engine — canlı durum: online/offline/idle/busy/sleeping.
// Event-driven: cihaz reportPresence çağırır; server poll YOK. Heartbeat
// gecikmesinden offline türetilir (derived).

const OFFLINE_AFTER_MS = 90_000; // 90sn heartbeat penceresi (mobile ile aynı)
const IDLE_AFTER_MS = 5 * 60_000; // 5 dk aktivite yoksa idle

const g = globalThis as unknown as { __apexCloudPresence?: Map<string, DevicePresence> };

function store(): Map<string, DevicePresence> {
  if (!g.__apexCloudPresence) g.__apexCloudPresence = new Map();
  return g.__apexCloudPresence;
}

/** Cihaz durumunu bildir — açık rapor (busy/sleeping istemci bilir). */
export function reportPresence(deviceId: string, status: PresenceStatus): DevicePresence {
  const presence: DevicePresence = {
    deviceId,
    status,
    reportedAt: new Date().toISOString(),
    derived: false,
  };
  store().set(deviceId, presence);
  return presence;
}

/** Güncel presence — heartbeat gecikmesine göre offline/idle türetir. */
export function getPresence(deviceId: string): DevicePresence {
  const reported = store().get(deviceId);
  const device = getCloudDevices().find((d) => d.id === deviceId);
  const now = Date.now();

  if (device) {
    // Revoked/disabled cihaz canlı sayılmaz — sync/push/routing dışı kalır
    if (device.state === 'revoked' || device.state === 'disabled') {
      return { deviceId, status: 'offline', reportedAt: new Date().toISOString(), derived: true };
    }
    const sinceHeartbeat = now - new Date(device.lastSeen).getTime();
    if (sinceHeartbeat > OFFLINE_AFTER_MS) {
      return { deviceId, status: 'offline', reportedAt: new Date().toISOString(), derived: true };
    }
    if (reported && (reported.status === 'busy' || reported.status === 'sleeping')) {
      return reported; // açık rapor korunur
    }
    const sinceReport = reported ? now - new Date(reported.reportedAt).getTime() : Infinity;
    if (sinceReport > IDLE_AFTER_MS) {
      return { deviceId, status: 'idle', reportedAt: new Date().toISOString(), derived: true };
    }
    return reported ?? { deviceId, status: 'online', reportedAt: device.lastSeen, derived: true };
  }

  return (
    reported ?? { deviceId, status: 'offline', reportedAt: new Date().toISOString(), derived: true }
  );
}

export function getAllPresence(): DevicePresence[] {
  return getCloudDevices().map((d) => getPresence(d.id));
}

export function getOnlineDeviceIds(): string[] {
  return getAllPresence()
    .filter((p) => p.status === 'online' || p.status === 'busy' || p.status === 'idle')
    .map((p) => p.deviceId);
}
