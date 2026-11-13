import { describe, it, expect } from 'vitest';
import { installPlugin, enablePlugin } from '../src/lib/plugins/plugin-lifecycle';
import { grantPermissions } from '../src/lib/plugins/permission-engine';
import { removePlugin } from '../src/lib/plugins/plugin-registry';
import { buildPluginContext } from '../src/lib/plugins/plugin-context';
import { runInSandbox } from '../src/lib/plugins/plugin-sandbox';
import type { PluginManifest } from '../src/lib/plugins/types';

function setup(id: string, permissions: PluginManifest['permissions']) {
  removePlugin(id);
  installPlugin({
    id,
    name: id,
    version: '1.0.0',
    author: 'T',
    permissions,
    actions: [],
    hooks: [],
    settings: {},
    icon: '🔌',
    category: 'other',
  });
  enablePlugin(id);
  grantPermissions(id, permissions);
}

describe('Plugin Context — izin-kontrollü yüzey', () => {
  it('izin verilen yüzey erişilebilir, verilmeyen undefined', () => {
    const id = `ctx-${Date.now()}`;
    setup(id, ['trading']);
    const ctx = buildPluginContext(id);
    expect(ctx.trading).toBeDefined(); // trading izni var
    expect(ctx.commerce).toBeUndefined(); // commerce izni yok
    expect(ctx.hasPermission('trading')).toBe(true);
    expect(ctx.hasPermission('desktop')).toBe(false);
  });

  it('notifications izni → push yüzeyi', () => {
    const id = `ctx2-${Date.now()}`;
    setup(id, ['notifications']);
    const ctx = buildPluginContext(id);
    expect(ctx.notifications).toBeDefined();
    expect(() => ctx.notifications!.push('test', 'body')).not.toThrow();
  });

  it('workflow izni → agent yüzeyi', () => {
    const id = `ctx3-${Date.now()}`;
    setup(id, ['workflow']);
    const ctx = buildPluginContext(id);
    expect(ctx.agent).toBeDefined();
    const r = ctx.agent!.create('Test Agent', 'do stuff');
    expect(r).toHaveProperty('queued');
  });
});

describe('Plugin Sandbox — izolasyon', () => {
  it('sandbox context ile fonksiyon çalıştırır', async () => {
    const id = `sb-${Date.now()}`;
    setup(id, ['trading']);
    const result = await runInSandbox(id, (ctx) => ctx.hasPermission('trading'));
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });

  it('izin ihlali → permissionDenied (izole)', async () => {
    const id = `sb2-${Date.now()}`;
    setup(id, ['trading']);
    const result = await runInSandbox(id, async (ctx) => {
      // commerce izni yok — context'te commerce undefined, elle require çağır
      const { requirePermission } = await import('../src/lib/plugins/permission-engine');
      requirePermission(ctx.pluginId, 'commerce');
      return 'reached';
    });
    expect(result.ok).toBe(false);
    expect(result.permissionDenied).toBe(true);
  });

  it("hata sandbox'ta yakalanır (dışarı sızmaz)", async () => {
    const id = `sb3-${Date.now()}`;
    setup(id, ['trading']);
    const result = await runInSandbox(id, () => {
      throw new Error('plugin çöktü');
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('çöktü');
  });

  it('disabled plugin çalıştırılamaz', async () => {
    const id = `sb4-${Date.now()}`;
    setup(id, ['trading']);
    const { disablePlugin } = await import('../src/lib/plugins/plugin-lifecycle');
    disablePlugin(id);
    const result = await runInSandbox(id, () => 'x');
    expect(result.ok).toBe(false);
  });
});
