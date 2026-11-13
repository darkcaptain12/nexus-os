import type { MobileDevice, DevicePlatform } from './types';

// Device Registry — bağlı mobil/wearable cihazlar. Ring buffer, event-driven
// (cihaz heartbeat gönderir; server poll yapmaz).

const MAX_DEVICES = 50;
const ONLINE_WINDOW_MS = 90_000; // 90sn heartbeat penceresi

const g = globalThis as unknown as { __apexMobileDevices?: Map<string, MobileDevice> };

function store(): Map<string, MobileDevice> {
  if (!g.__apexMobileDevices) g.__apexMobileDevices = new Map();
  return g.__apexMobileDevices;
}

export interface RegisterDeviceInput {
  platform: DevicePlatform;
  name: string;
  pushToken?: string;
  batteryLevel?: number;
  appVersion?: string;
  deviceId?: string;
}

export function registerDevice(input: RegisterDeviceInput): MobileDevice {
  const s = store();
  const now = new Date().toISOString();
  const id = input.deviceId ?? crypto.randomUUID();
  const existing = s.get(id);

  const device: MobileDevice = {
    id,
    platform: input.platform,
    name: input.name,
    pushToken: input.pushToken ?? existing?.pushToken,
    batteryLevel: input.batteryLevel ?? existing?.batteryLevel ?? null,
    online: true,
    lastSeenAt: now,
    registeredAt: existing?.registeredAt ?? now,
    appVersion: input.appVersion ?? existing?.appVersion,
  };
  s.set(id, device);
  if (s.size > MAX_DEVICES) {
    const oldest = [...s.values()].sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt))[0];
    if (oldest) s.delete(oldest.id);
  }
  return device;
}

/** Heartbeat — cihaz online kalır, batarya günceller. */
export function heartbeat(deviceId: string, batteryLevel?: number): MobileDevice | null {
  const device = store().get(deviceId);
  if (!device) return null;
  device.lastSeenAt = new Date().toISOString();
  device.online = true;
  if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
  return device;
}

function refreshOnlineStatus(device: MobileDevice): MobileDevice {
  const online = Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
  device.online = online;
  return device;
}

export function getDevices(): MobileDevice[] {
  return [...store().values()].map(refreshOnlineStatus);
}

export function getDevice(id: string): MobileDevice | null {
  const d = store().get(id);
  return d ? refreshOnlineStatus(d) : null;
}

export function getWatchDevices(): MobileDevice[] {
  return getDevices().filter((d) => d.platform === 'apple-watch' || d.platform === 'wear-os');
}

export function getPushTokens(category?: DevicePlatform): string[] {
  return getDevices()
    .filter((d) => d.online && d.pushToken && (!category || d.platform === category))
    .map((d) => d.pushToken!)
    .filter(Boolean);
}

export function removeDevice(id: string): boolean {
  return store().delete(id);
}
