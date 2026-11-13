import { describe, it, expect } from 'vitest';
import {
  mobileHome,
  mobileApprovals,
  mobileTrading,
  mobileCommerce,
  mobileDesktopCompanion,
  mobileWidget,
  mobileWatch,
  mobileSystemHealth,
  mobileRegisterDevice,
  mobilePush,
  mobileSync,
  mobileEnqueueMutation,
  getAuthCapabilities,
} from '../src/lib/mobile/services/mobile-service';
import { getCommerceOverview } from '../src/lib/commerce/commerce-service';

describe('Mobile Service — facade (mobil sözleşme)', () => {
  it('getAuthCapabilities Supabase + biyometrik', () => {
    const auth = getAuthCapabilities();
    expect(auth.provider).toBe('supabase');
    expect(auth.biometric).toContain('faceid');
    expect(auth.biometric).toContain('touchid');
    expect(auth.biometric).toContain('passkey');
    expect(auth.sessionReuse).toBe(true);
  });

  it('mobileHome düz JSON dashboard döner', async () => {
    const d = await mobileHome();
    expect(d.generatedAt).toBeTruthy();
    // Serileştirilebilir olmalı (framework tipi sızmamalı)
    expect(() => JSON.stringify(d)).not.toThrow();
  });

  it('mobileApprovals liste döner', () => {
    expect(Array.isArray(mobileApprovals())).toBe(true);
  });

  it('mobileTrading paper view', async () => {
    const t = await mobileTrading();
    expect(t.mode).toBe('paper');
  });

  it('mobileDesktopCompanion evdeki PC durumu', () => {
    const c = mobileDesktopCompanion();
    expect(c).toHaveProperty('online');
  });

  it('mobileWidget boyut projeksiyon', async () => {
    const w = await mobileWidget('medium', 'ios');
    expect(w.lines.length).toBe(4);
  });

  it('mobileWatch Apple Watch view', async () => {
    const v = await mobileWatch();
    expect(v).toHaveProperty('approvals');
  });

  it('mobileSystemHealth mobile health', () => {
    const h = mobileSystemHealth();
    expect(h.eventDriven).toBe(true);
  });
});

describe('Commerce Service — migration 009 reuse', () => {
  it('getCommerceOverview yapı döner (Supabase yoksa graceful)', async () => {
    const c = await getCommerceOverview();
    expect(c).toHaveProperty('configured');
    expect(c).toHaveProperty('metrics');
    expect(c).toHaveProperty('alerts');
    expect(Array.isArray(c.orders)).toBe(true);
    // Test ortamında Supabase yapılandırılmamış → configured false, boş
    expect(c.configured).toBe(false);
    expect(c.metrics.totalOrders).toBe(0);
  });

  it('mobileCommerce facade commerce servisini reuse eder', async () => {
    const c = await mobileCommerce();
    expect(c).toHaveProperty('metrics');
  });
});

describe('Mobile Service — Offline + Sync akışı', () => {
  it('device kayıt → mutation enqueue → sync', () => {
    const device = mobileRegisterDevice({
      platform: 'ios',
      name: 'Sync Flow',
      deviceId: crypto.randomUUID(),
    });
    mobileEnqueueMutation({
      entity: 'tasks',
      action: 'complete',
      payload: { id: 'flow-1' },
      deviceId: device.id,
    });
    const result = mobileSync('last-write-wins');
    expect(result.applied + result.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('push notification event-driven', () => {
    const n = mobilePush({ category: 'agent', title: 'Agent tamamlandı', body: 'başarılı' });
    expect(n.category).toBe('agent');
    expect(n.id).toBeTruthy();
  });
});
