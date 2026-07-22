import { describe, it, expect } from 'vitest';
import { registerCloudDevice, pairDevice, verifyDevice } from '../src/lib/cloud/device-manager';
import {
  reportPresence,
  getPresence,
  getAllPresence,
  getOnlineDeviceIds,
} from '../src/lib/cloud/presence-engine';
import {
  reportVitals,
  computeHealthScore,
  getFleetHealthAvg,
  getVitals,
} from '../src/lib/cloud/device-intelligence';
import { routeNotification, getRoutedNotifications } from '../src/lib/cloud/notification-router';
import { raiseAlert } from '../src/lib/quant/live/live-alerts';

function activeDevice(name: string, type: Parameters<typeof registerCloudDevice>[0]['type']) {
  const d = registerCloudDevice({
    name,
    type,
    platform: 'test',
    version: '1.0.0',
    battery: 90,
    network: 'wifi',
  });
  const pairing = pairDevice(d.id)!;
  verifyDevice(pairing.code);
  return d;
}

describe('Presence Engine — online/offline/idle/busy/sleeping', () => {
  it('rapor edilen durum döner', () => {
    const d = activeDevice(`P1-${Date.now()}`, 'mac');
    reportPresence(d.id, 'busy');
    expect(getPresence(d.id).status).toBe('busy');
    expect(getPresence(d.id).derived).toBe(false);
  });

  it('sleeping açık raporu korunur', () => {
    const d = activeDevice(`P2-${Date.now()}`, 'iphone');
    reportPresence(d.id, 'sleeping');
    expect(getPresence(d.id).status).toBe('sleeping');
  });

  it('kayıtsız cihaz offline türetilir', () => {
    const p = getPresence('hic-yok-device');
    expect(p.status).toBe('offline');
    expect(p.derived).toBe(true);
  });

  it('tüm filo presence + online listesi', () => {
    const d = activeDevice(`P3-${Date.now()}`, 'android');
    reportPresence(d.id, 'online');
    const all = getAllPresence();
    expect(all.some((p) => p.deviceId === d.id)).toBe(true);
    expect(getOnlineDeviceIds()).toContain(d.id);
  });
});

describe('Device Intelligence — health skoru + sync durumu', () => {
  it('sağlıklı cihaz yüksek skor', () => {
    const score = computeHealthScore({
      cpuPercent: 20,
      ramPercent: 40,
      storagePercent: 50,
      network: 'wifi',
      battery: 90,
    });
    expect(score).toBe(100);
  });

  it('baskı altında skor düşer: CPU+RAM+storage+batarya+ağ cezaları', () => {
    const score = computeHealthScore({
      cpuPercent: 95,
      ramPercent: 95,
      storagePercent: 95,
      network: 'offline',
      battery: 10,
    });
    expect(score).toBe(0); // 100-25-20-20-30-15 → clamp 0
  });

  it('vitals raporu sync durumu içerir', () => {
    const d = activeDevice(`V1-${Date.now()}`, 'ipad');
    const v = reportVitals({
      deviceId: d.id,
      cpuPercent: 30,
      ramPercent: 50,
      storagePercent: 60,
      network: 'wifi',
      battery: 70,
    });
    expect(v.healthScore).toBe(100);
    expect(['synced', 'behind', 'never']).toContain(v.syncStatus);
    expect(getVitals(d.id)!.deviceId).toBe(d.id);
  });

  it('filo sağlık ortalaması hesaplanır', () => {
    expect(getFleetHealthAvg()).toBeGreaterThan(0);
    expect(getFleetHealthAvg()).toBeLessThanOrEqual(100);
  });
});

describe('Notification Routing — doğru cihaza', () => {
  it('trading approval → telefon', () => {
    const phone = activeDevice(`R-phone-${Date.now()}`, 'iphone');
    reportPresence(phone.id, 'online');
    activeDevice(`R-mac-${Date.now()}`, 'mac');

    const routed = routeNotification({
      category: 'approval',
      title: 'Trading onayı',
      body: 'BTCUSDT long 0.01',
      requiresApproval: true,
    });
    expect(routed.routedTo.length).toBeGreaterThan(0);
    expect(
      routed.routedTo.every((r) => r.deviceType === 'iphone' || r.deviceType === 'android'),
    ).toBe(true);
  });

  it('critical risk → saat + telefon', () => {
    const watch = activeDevice(`R-watch-${Date.now()}`, 'apple-watch');
    reportPresence(watch.id, 'online');

    const routed = routeNotification({
      category: 'risk',
      severity: 'critical',
      title: 'Margin call',
      body: 'Likidasyon riski',
    });
    const types = routed.routedTo.map((r) => r.deviceType);
    expect(types).toContain('apple-watch');
    expect(types.every((t) => ['apple-watch', 'wear-os', 'iphone', 'android'].includes(t))).toBe(
      true,
    );
  });

  it('desktop event → Mac/Windows', () => {
    const routed = routeNotification({
      category: 'desktop',
      title: 'Build bitti',
      body: 'apex-os derlendi',
    });
    expect(routed.routedTo.every((r) => r.deviceType === 'mac' || r.deviceType === 'windows')).toBe(
      true,
    );
  });

  it('routing geçmişi tutulur', () => {
    expect(getRoutedNotifications(10).length).toBeGreaterThan(0);
  });

  it("live-alerts critical alert router'ı tetikler (Sprint 20 wiring)", () => {
    const before = getRoutedNotifications(50).length;
    raiseAlert('margin_call', 'BTCUSDT', 'Margin seviyesi kritik');
    const after = getRoutedNotifications(50);
    expect(after.length).toBeGreaterThan(before);
    expect(after[0]!.severity).toBe('critical');
  });
});
