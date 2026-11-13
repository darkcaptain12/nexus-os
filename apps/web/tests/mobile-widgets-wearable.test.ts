import { describe, it, expect } from 'vitest';
import { buildWidget } from '../src/lib/mobile/widget-provider';
import { buildWearableView } from '../src/lib/mobile/wearable-provider';
import { getMobileSystemHealth, runBackgroundSync } from '../src/lib/mobile/background-service';
import { registerDevice } from '../src/lib/mobile/device-registry';

describe('Widget Provider — iOS/Android', () => {
  it('lock-screen 1 satır', async () => {
    const w = await buildWidget('lock-screen', 'ios');
    expect(w.lines.length).toBe(1);
    expect(w.size).toBe('lock-screen');
  });

  it('small 2 satır', async () => {
    const w = await buildWidget('small', 'ios');
    expect(w.lines.length).toBe(2);
  });

  it('medium 4 satır', async () => {
    const w = await buildWidget('medium', 'ios');
    expect(w.lines.length).toBe(4);
  });

  it('large 8 satır', async () => {
    const w = await buildWidget('large', 'ios');
    expect(w.lines.length).toBe(8);
  });

  it('android material 4 satır', async () => {
    const w = await buildWidget('material', 'android');
    expect(w.lines.length).toBe(4);
    expect(w.platform).toBe('android');
  });

  it('PnL accent up/down işaretlenir', async () => {
    const w = await buildWidget('large', 'ios');
    const pnlLine = w.lines.find((l) => l.label === 'Günlük PnL');
    expect(pnlLine?.accent).toMatch(/up|down|neutral/);
  });
});

describe('Wearable Provider — Apple Watch / Wear OS', () => {
  it('watch view tüm bölümleri içerir', async () => {
    const v = await buildWearableView();
    expect(v).toHaveProperty('executive');
    expect(v).toHaveProperty('trading');
    expect(v).toHaveProperty('tasks');
    expect(v).toHaveProperty('approvals');
    expect(v).toHaveProperty('voiceReady');
    expect(Array.isArray(v.notifications)).toBe(true);
  });

  it('voiceReady voice servisinden', async () => {
    const v = await buildWearableView();
    expect(typeof v.voiceReady).toBe('boolean');
  });

  it('executive focus + risk döner', async () => {
    const v = await buildWearableView();
    expect(v.executive.focus.length).toBeGreaterThan(0);
    expect(typeof v.executive.riskScore).toBe('number');
  });
});

describe('Background Service — System Health', () => {
  it('mobile system health cihaz/push/kuyruk döner', () => {
    registerDevice({
      platform: 'apple-watch',
      name: 'Watch Health',
      deviceId: crypto.randomUUID(),
    });
    const h = getMobileSystemHealth();
    expect(typeof h.connectedDevices).toBe('number');
    expect(typeof h.pushQueueLength).toBe('number');
    expect(typeof h.offlineQueueLength).toBe('number');
    expect(typeof h.syncQueueLength).toBe('number');
    expect(h.eventDriven).toBe(true);
    expect(Array.isArray(h.devices)).toBe(true);
  });

  it('background sync offline cache tazeler', async () => {
    const r = await runBackgroundSync();
    expect(r.refreshed).toBe(true);
    expect(r.cachedAt).toBeTruthy();
  });

  it('watch bağlıysa watchConnected true', () => {
    const id = crypto.randomUUID();
    registerDevice({ platform: 'wear-os', name: 'Wear Test', deviceId: id });
    const h = getMobileSystemHealth();
    expect(h.watchConnected).toBe(true);
  });
});
