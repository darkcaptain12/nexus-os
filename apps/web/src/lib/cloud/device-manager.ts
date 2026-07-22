import type { CloudDevice, CloudDeviceType, NetworkKind } from './types';
import {
  registerDevice as registerMobileDevice,
  heartbeat as mobileHeartbeat,
  removeDevice as removeMobileDevice,
  type RegisterDeviceInput,
} from '@/lib/mobile/device-registry';
import type { DevicePlatform } from '@/lib/mobile/types';
import { logSecurityEvent } from './cloud-security';
import { recordDevice } from '@/lib/knowledge/auto-linker';
import { deferPersist } from '@/lib/persist-after';
import { persistCloudDevice } from '@/lib/persist-stores';

// Device Manager — tüm cihaz tipleri (Mac/Windows/iPhone/iPad/Watch/Android/
// Wear OS/Web) için registry + pair/verify/trust yaşam döngüsü. Mobil
// platformlar mevcut mobile/device-registry'ye DE kaydedilir (push token'lar
// notification-center'a akar — reuse, yeniden yazma yok).

const MAX_DEVICES = 50;
const PAIRING_TTL_MS = 5 * 60_000; // 5 dk

const g = globalThis as unknown as {
  __apexCloudDevices?: Map<string, CloudDevice>;
  __apexPairingCodes?: Map<string, { deviceId: string; expiresAt: number }>;
};

function store(): Map<string, CloudDevice> {
  if (!g.__apexCloudDevices) g.__apexCloudDevices = new Map();
  return g.__apexCloudDevices;
}

function pairings(): Map<string, { deviceId: string; expiresAt: number }> {
  if (!g.__apexPairingCodes) g.__apexPairingCodes = new Map();
  return g.__apexPairingCodes;
}

const MOBILE_PLATFORM_MAP: Partial<Record<CloudDeviceType, DevicePlatform>> = {
  iphone: 'ios',
  ipad: 'ipad',
  android: 'android',
  'apple-watch': 'apple-watch',
  'wear-os': 'wear-os',
};

export interface RegisterCloudDeviceInput {
  name: string;
  type: CloudDeviceType;
  platform: string;
  version: string;
  capabilities?: string[];
  battery?: number;
  network?: NetworkKind;
  pushToken?: string;
  deviceId?: string;
}

/** Cihaz kaydı — pending durumda başlar, pair+verify ile aktifleşir. */
export function registerCloudDevice(input: RegisterCloudDeviceInput): CloudDevice {
  const s = store();
  const now = new Date().toISOString();
  const id = input.deviceId ?? crypto.randomUUID();
  const existing = s.get(id);

  const device: CloudDevice = {
    id,
    name: input.name,
    type: input.type,
    platform: input.platform,
    version: input.version,
    capabilities: input.capabilities ?? existing?.capabilities ?? [],
    battery: input.battery ?? existing?.battery ?? null,
    network: input.network ?? existing?.network ?? 'wifi',
    lastSeen: now,
    pushToken: input.pushToken ?? existing?.pushToken,
    trusted: existing?.trusted ?? false,
    verified: existing?.verified ?? false,
    state: existing?.state ?? 'pending',
    pairedAt: existing?.pairedAt ?? now,
    encryption: existing?.encryption ?? {
      algorithm: 'aes-256-gcm',
      keyId: crypto.randomUUID().slice(0, 8),
      rotatedAt: now,
    },
  };
  s.set(id, device);
  if (s.size > MAX_DEVICES) {
    const oldest = [...s.values()].sort((a, b) => a.lastSeen.localeCompare(b.lastSeen))[0];
    if (oldest) s.delete(oldest.id);
  }

  // Mobil platform → mevcut mobile registry'ye de kaydet (push token akışı)
  const mobilePlatform = MOBILE_PLATFORM_MAP[input.type];
  if (mobilePlatform) {
    const mobileInput: RegisterDeviceInput = {
      platform: mobilePlatform,
      name: input.name,
      pushToken: input.pushToken,
      batteryLevel: input.battery,
      appVersion: input.version,
      deviceId: id,
    };
    registerMobileDevice(mobileInput);
  }

  // Knowledge Graph: User → Device ilişkisi
  recordDevice({ id, name: input.name, type: input.type, platform: input.platform });
  deferPersist(() => persistCloudDevice({ ...device })); // write-through (persistCloudDevice içinde alan ayrıştırır)

  return device;
}

/** Pairing kodu üret — cihaz eşleştirme (6 haneli, 5 dk TTL). */
export function pairDevice(deviceId: string): { code: string; expiresAt: string } | null {
  const device = store().get(deviceId);
  if (!device || device.state === 'revoked') return null;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + PAIRING_TTL_MS;
  pairings().set(code, { deviceId, expiresAt });
  logSecurityEvent('device-paired', deviceId, `Pairing kodu üretildi: ${device.name}`);
  return { code, expiresAt: new Date(expiresAt).toISOString() };
}

/** Pairing kodunu doğrula — cihaz verified + active olur. */
export function verifyDevice(code: string): CloudDevice | null {
  const entry = pairings().get(code);
  if (!entry) return null;
  pairings().delete(code);
  if (Date.now() > entry.expiresAt) return null;
  const device = store().get(entry.deviceId);
  if (!device || device.state === 'revoked') return null;
  device.verified = true;
  device.state = 'active';
  logSecurityEvent('device-verified', device.id, `Cihaz doğrulandı: ${device.name}`);
  return device;
}

export function renameDevice(deviceId: string, name: string): CloudDevice | null {
  const device = store().get(deviceId);
  if (!device) return null;
  device.name = name;
  return device;
}

export function disableDevice(deviceId: string): CloudDevice | null {
  const device = store().get(deviceId);
  if (!device || device.state === 'revoked') return null;
  device.state = 'disabled';
  return device;
}

export function enableDevice(deviceId: string): CloudDevice | null {
  const device = store().get(deviceId);
  if (!device || device.state === 'revoked') return null;
  device.state = device.verified ? 'active' : 'pending';
  return device;
}

/** Cihazı kaldır — mobile registry'den de düşer. */
export function removeCloudDevice(deviceId: string): boolean {
  removeMobileDevice(deviceId);
  return store().delete(deviceId);
}

/** Heartbeat — lastSeen + batarya/ağ güncelle. Mobile registry'ye de yansır. */
export function cloudHeartbeat(
  deviceId: string,
  update?: { battery?: number; network?: NetworkKind },
): CloudDevice | null {
  const device = store().get(deviceId);
  if (!device) return null;
  device.lastSeen = new Date().toISOString();
  if (update?.battery !== undefined) device.battery = update.battery;
  if (update?.network) device.network = update.network;
  if (MOBILE_PLATFORM_MAP[device.type]) mobileHeartbeat(deviceId, update?.battery);
  return device;
}

export function getCloudDevices(state?: CloudDevice['state']): CloudDevice[] {
  const all = [...store().values()];
  return state ? all.filter((d) => d.state === state) : all;
}

export function getCloudDevice(deviceId: string): CloudDevice | null {
  return store().get(deviceId) ?? null;
}

/** Cihaz sağlık özeti — device-intelligence vitals ile birleşir. */
export function getDeviceHealth(deviceId: string): { device: CloudDevice; online: boolean } | null {
  const device = store().get(deviceId);
  if (!device) return null;
  const online = Date.now() - new Date(device.lastSeen).getTime() < 90_000;
  return { device, online };
}
