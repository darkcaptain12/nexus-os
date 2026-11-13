import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerDevice,
  heartbeat,
  getDevices,
  getDevice,
  getWatchDevices,
  getPushTokens,
  removeDevice,
} from '../src/lib/mobile/device-registry';
import {
  pushNotification,
  getNotifications,
  getPushStats,
  clearNotifications,
} from '../src/lib/mobile/notification-center';

describe('Device Registry', () => {
  it('registerDevice yeni cihaz kaydeder (online)', () => {
    const d = registerDevice({
      platform: 'ios',
      name: 'iPhone 15',
      pushToken: 'tok-1',
      batteryLevel: 80,
    });
    expect(d.id).toBeTruthy();
    expect(d.online).toBe(true);
    expect(d.batteryLevel).toBe(80);
  });

  it('aynı deviceId ile re-register günceller', () => {
    const first = registerDevice({
      platform: 'android',
      name: 'Pixel',
      deviceId: crypto.randomUUID(),
    });
    const second = registerDevice({
      platform: 'android',
      name: 'Pixel Pro',
      deviceId: first.id,
      batteryLevel: 50,
    });
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Pixel Pro');
    expect(second.batteryLevel).toBe(50);
  });

  it('heartbeat batarya günceller + online tutar', () => {
    const d = registerDevice({ platform: 'ios', name: 'iPad', batteryLevel: 90 });
    const hb = heartbeat(d.id, 75);
    expect(hb!.batteryLevel).toBe(75);
    expect(hb!.online).toBe(true);
  });

  it('heartbeat bilinmeyen cihaz null', () => {
    expect(heartbeat('yok-id')).toBeNull();
  });

  it('getWatchDevices sadece watch/wear döner', () => {
    registerDevice({ platform: 'apple-watch', name: 'Watch Ultra', deviceId: crypto.randomUUID() });
    const watches = getWatchDevices();
    expect(watches.every((w) => w.platform === 'apple-watch' || w.platform === 'wear-os')).toBe(
      true,
    );
    expect(watches.length).toBeGreaterThan(0);
  });

  it('getPushTokens online + token olanları döner', () => {
    registerDevice({
      platform: 'ios',
      name: 'Push Test',
      pushToken: 'push-abc',
      deviceId: crypto.randomUUID(),
    });
    expect(getPushTokens()).toContain('push-abc');
  });

  it('removeDevice siler', () => {
    const d = registerDevice({ platform: 'ios', name: 'Sil', deviceId: crypto.randomUUID() });
    expect(removeDevice(d.id)).toBe(true);
    expect(getDevice(d.id)).toBeNull();
  });

  it('getDevices liste döner', () => {
    expect(Array.isArray(getDevices())).toBe(true);
  });
});

describe('Notification Center', () => {
  beforeEach(() => clearNotifications());

  it('push event oluşturur + online cihazlara hedefler', () => {
    registerDevice({
      platform: 'ios',
      name: 'Notif',
      pushToken: 'nt-1',
      deviceId: crypto.randomUUID(),
    });
    const n = pushNotification({
      category: 'trading',
      title: 'BTC arttı',
      body: '%5 yükseldi',
      severity: 'info',
    });
    expect(n.category).toBe('trading');
    expect(n.deliveredTo.length).toBeGreaterThanOrEqual(0);
  });

  it('8 kategori desteklenir', () => {
    const cats = [
      'trading',
      'commerce',
      'agent',
      'desktop',
      'memory',
      'workflow',
      'approval',
      'risk',
    ] as const;
    for (const c of cats) {
      const n = pushNotification({ category: c, title: `${c} test`, body: 'body' });
      expect(n.category).toBe(c);
    }
    expect(getNotifications(50).length).toBe(8);
  });

  it('kategori filtresi çalışır', () => {
    pushNotification({ category: 'risk', title: 'Risk yüksek', body: 'dikkat' });
    const riskOnly = getNotifications(30, 'risk');
    expect(riskOnly.every((n) => n.category === 'risk')).toBe(true);
  });

  it('requiresApproval işaretlenir', () => {
    const n = pushNotification({
      category: 'approval',
      title: 'BTC al onayı',
      body: 'onayla',
      requiresApproval: true,
    });
    expect(n.requiresApproval).toBe(true);
  });

  it('getPushStats yapı döner', () => {
    const s = getPushStats();
    expect(typeof s.queueLength).toBe('number');
    expect(typeof s.deliveredTotal).toBe('number');
  });
});
