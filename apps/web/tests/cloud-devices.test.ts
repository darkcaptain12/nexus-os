import { describe, it, expect } from 'vitest';
import {
  registerCloudDevice,
  pairDevice,
  verifyDevice,
  renameDevice,
  disableDevice,
  enableDevice,
  removeCloudDevice,
  cloudHeartbeat,
  getCloudDevice,
  getDeviceHealth,
} from '../src/lib/cloud/device-manager';
import {
  trustDevice,
  revokeDevice,
  createDeviceSession,
  revokeSession,
  remoteLogout,
  rotatePushToken,
  rotateEncryptionKey,
  getActiveSessions,
  getSecurityEvents,
} from '../src/lib/cloud/cloud-security';
import { getDevices as getMobileDevices } from '../src/lib/mobile/device-registry';

function makeDevice(name: string, type: Parameters<typeof registerCloudDevice>[0]['type'] = 'mac') {
  return registerCloudDevice({
    name,
    type,
    platform: type === 'mac' ? 'macOS 15.5' : 'iOS 19.2',
    version: '1.0.0',
    capabilities: ['push', 'voice'],
    battery: 80,
    network: 'wifi',
  });
}

describe('Device Manager — register/pair/verify/rename/disable/remove', () => {
  it('kayıt pending başlar, pair+verify ile aktifleşir', () => {
    const d = makeDevice(`Mac-${Date.now()}`);
    expect(d.state).toBe('pending');
    expect(d.verified).toBe(false);

    const pairing = pairDevice(d.id);
    expect(pairing).not.toBeNull();
    expect(pairing!.code).toMatch(/^\d{6}$/);

    const verified = verifyDevice(pairing!.code);
    expect(verified!.verified).toBe(true);
    expect(verified!.state).toBe('active');
  });

  it('geçersiz pairing kodu reddedilir', () => {
    expect(verifyDevice('000000')).toBeNull();
  });

  it('pairing kodu tek kullanımlık', () => {
    const d = makeDevice(`Mac2-${Date.now()}`);
    const pairing = pairDevice(d.id)!;
    expect(verifyDevice(pairing.code)).not.toBeNull();
    expect(verifyDevice(pairing.code)).toBeNull(); // ikinci kullanım
  });

  it('rename/disable/enable/remove çalışır', () => {
    const d = makeDevice(`Win-${Date.now()}`, 'windows');
    expect(renameDevice(d.id, 'Oyun PC')!.name).toBe('Oyun PC');
    expect(disableDevice(d.id)!.state).toBe('disabled');
    expect(enableDevice(d.id)!.state).toBe('pending'); // verify edilmemişti
    expect(removeCloudDevice(d.id)).toBe(true);
    expect(getCloudDevice(d.id)).toBeNull();
  });

  it("mobil platform mevcut mobile registry'ye de kaydedilir (reuse)", () => {
    const d = makeDevice(`iPhone-${Date.now()}`, 'iphone');
    const mobile = getMobileDevices().find((m) => m.id === d.id);
    expect(mobile).toBeDefined();
    expect(mobile!.platform).toBe('ios');
  });

  it('heartbeat lastSeen + batarya günceller, health online döner', () => {
    const d = makeDevice(`iPad-${Date.now()}`, 'ipad');
    const updated = cloudHeartbeat(d.id, { battery: 45, network: 'cellular' });
    expect(updated!.battery).toBe(45);
    expect(updated!.network).toBe('cellular');
    expect(getDeviceHealth(d.id)!.online).toBe(true);
  });

  it('encryption metadata kayıtta üretilir', () => {
    const d = makeDevice(`Enc-${Date.now()}`);
    expect(d.encryption.algorithm).toBe('aes-256-gcm');
    expect(d.encryption.keyId.length).toBeGreaterThan(0);
  });
});

describe('Cloud Security — trust/revoke/session/logout/rotation', () => {
  it('yalnız verified cihaz trust alabilir', () => {
    const d = makeDevice(`Trust-${Date.now()}`);
    expect(trustDevice(d)).toBeNull(); // verified değil
    const pairing = pairDevice(d.id)!;
    verifyDevice(pairing.code);
    expect(trustDevice(d)!.trusted).toBe(true);
  });

  it('revoke → state revoked, trust düşer, push token silinir, oturumlar kapanır', () => {
    const d = makeDevice(`Revoke-${Date.now()}`);
    const pairing = pairDevice(d.id)!;
    verifyDevice(pairing.code);
    trustDevice(d);
    createDeviceSession(d.id);
    rotatePushToken(d, 'token-abc-12345');

    const revoked = revokeDevice(d);
    expect(revoked.state).toBe('revoked');
    expect(revoked.trusted).toBe(false);
    expect(revoked.pushToken).toBeUndefined();
    expect(getActiveSessions(d.id).length).toBe(0);
  });

  it('revoked cihaz pair edilemez, enable edilemez', () => {
    const d = makeDevice(`Dead-${Date.now()}`);
    revokeDevice(d);
    expect(pairDevice(d.id)).toBeNull();
    expect(enableDevice(d.id)).toBeNull();
  });

  it('session revoke + remote logout', () => {
    const d = makeDevice(`Sess-${Date.now()}`);
    const s1 = createDeviceSession(d.id);
    createDeviceSession(d.id);
    expect(getActiveSessions(d.id).length).toBe(2);
    expect(revokeSession(s1.sessionId)).toBe(true);
    expect(revokeSession(s1.sessionId)).toBe(false); // zaten iptal
    expect(remoteLogout(d.id)).toBe(1); // kalan 1 oturum
    expect(getActiveSessions(d.id).length).toBe(0);
  });

  it('push token + encryption key rotation güvenlik loguna düşer', () => {
    const d = makeDevice(`Rot-${Date.now()}`);
    const oldKey = d.encryption.keyId;
    rotatePushToken(d, 'new-token-xyz-99');
    rotateEncryptionKey(d);
    expect(d.pushToken).toBe('new-token-xyz-99');
    expect(d.encryption.keyId).not.toBe(oldKey);
    const events = getSecurityEvents(20, d.id);
    expect(events.some((e) => e.type === 'push-token-rotated')).toBe(true);
  });

  it('audit log tüm kritik olayları tutar', () => {
    const events = getSecurityEvents(100);
    expect(events.some((e) => e.type === 'device-revoked')).toBe(true);
    expect(events.some((e) => e.type === 'session-revoked')).toBe(true);
    expect(events.some((e) => e.type === 'remote-logout')).toBe(true);
  });
});
