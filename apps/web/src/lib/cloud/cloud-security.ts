import type { SecurityEvent, SecurityEventType, CloudDevice } from './types';

// Cloud Security — device trust, revocation, session yönetimi, remote logout,
// push token rotation, encryption metadata. Ham şifreleme istemci-tarafı
// (Secure Enclave / DPAPI); server yalnız metadata tutar. Ring buffer audit log.

const MAX_EVENTS = 300;

const g = globalThis as unknown as {
  __apexCloudSecurityLog?: SecurityEvent[];
  __apexCloudSessions?: Map<string, { deviceId: string; createdAt: string; revoked: boolean }>;
};

function log(): SecurityEvent[] {
  if (!g.__apexCloudSecurityLog) g.__apexCloudSecurityLog = [];
  return g.__apexCloudSecurityLog;
}

function sessions(): Map<string, { deviceId: string; createdAt: string; revoked: boolean }> {
  if (!g.__apexCloudSessions) g.__apexCloudSessions = new Map();
  return g.__apexCloudSessions;
}

export function logSecurityEvent(
  type: SecurityEventType,
  deviceId: string,
  detail: string,
): SecurityEvent {
  const event: SecurityEvent = {
    id: crypto.randomUUID(),
    type,
    deviceId,
    detail,
    at: new Date().toISOString(),
  };
  const l = log();
  l.push(event);
  if (l.length > MAX_EVENTS) l.shift();
  return event;
}

export function getSecurityEvents(limit = 50, deviceId?: string): SecurityEvent[] {
  let items = [...log()].reverse();
  if (deviceId) items = items.filter((e) => e.deviceId === deviceId);
  return items.slice(0, limit);
}

// ─── Trust / Revoke ──────────────────────────────────────────────────────────
// Not: device store'a device-manager sahip; circular import önlemek için
// mutasyonlar device objesi üzerinden yapılır (Map referansı aynı).

/** Cihaza güven — trusted işaretle. Yalnız verified cihaz trust alabilir. */
export function trustDevice(device: CloudDevice): CloudDevice | null {
  if (!device.verified || device.state === 'revoked') return null;
  device.trusted = true;
  logSecurityEvent('device-trusted', device.id, `Cihaz güvenilir işaretlendi: ${device.name}`);
  return device;
}

/** Cihaz erişimini iptal et — trust düşer, oturumlar kapanır, push token silinir. */
export function revokeDevice(device: CloudDevice): CloudDevice {
  device.state = 'revoked';
  device.trusted = false;
  device.pushToken = undefined;
  revokeSessionsForDevice(device.id);
  logSecurityEvent('device-revoked', device.id, `Cihaz erişimi iptal edildi: ${device.name}`);
  return device;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export function createDeviceSession(deviceId: string): { sessionId: string; createdAt: string } {
  const sessionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  sessions().set(sessionId, { deviceId, createdAt, revoked: false });
  return { sessionId, createdAt };
}

export function revokeSession(sessionId: string): boolean {
  const session = sessions().get(sessionId);
  if (!session || session.revoked) return false;
  session.revoked = true;
  logSecurityEvent('session-revoked', session.deviceId, `Oturum iptal: ${sessionId.slice(0, 8)}`);
  return true;
}

export function revokeSessionsForDevice(deviceId: string): number {
  let count = 0;
  for (const [id, session] of sessions()) {
    if (session.deviceId === deviceId && !session.revoked) {
      session.revoked = true;
      count++;
      logSecurityEvent('session-revoked', deviceId, `Oturum iptal: ${id.slice(0, 8)}`);
    }
  }
  return count;
}

/** Remote logout — cihazın tüm oturumları kapanır, cihaz aktif kalır. */
export function remoteLogout(deviceId: string): number {
  const count = revokeSessionsForDevice(deviceId);
  logSecurityEvent('remote-logout', deviceId, `Uzaktan çıkış — ${count} oturum kapatıldı`);
  return count;
}

export function getActiveSessions(
  deviceId?: string,
): { sessionId: string; deviceId: string; createdAt: string }[] {
  return [...sessions().entries()]
    .filter(([, s]) => !s.revoked && (!deviceId || s.deviceId === deviceId))
    .map(([sessionId, s]) => ({ sessionId, deviceId: s.deviceId, createdAt: s.createdAt }));
}

// ─── Push Token Rotation ─────────────────────────────────────────────────────

export function rotatePushToken(device: CloudDevice, newToken: string): CloudDevice {
  device.pushToken = newToken;
  logSecurityEvent('push-token-rotated', device.id, 'Push token yenilendi');
  return device;
}

// ─── Encryption Metadata ─────────────────────────────────────────────────────

/** Şifreleme anahtarı rotasyonu — yalnız metadata; ham anahtar istemcide. */
export function rotateEncryptionKey(device: CloudDevice): CloudDevice {
  device.encryption = {
    algorithm: 'aes-256-gcm',
    keyId: crypto.randomUUID().slice(0, 8),
    rotatedAt: new Date().toISOString(),
  };
  return device;
}
