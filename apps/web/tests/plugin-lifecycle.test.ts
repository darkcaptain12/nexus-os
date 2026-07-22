import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateManifest,
  getPlugin,
  removePlugin,
  getRegistryMetrics,
} from '../src/lib/plugins/plugin-registry';
import {
  installPlugin,
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  reloadPlugin,
  checkPluginHealth,
  updatePluginVersion,
} from '../src/lib/plugins/plugin-lifecycle';
import {
  grantPermissions,
  checkPermission,
  requirePermission,
  PermissionDeniedError,
} from '../src/lib/plugins/permission-engine';
import type { PluginManifest } from '../src/lib/plugins/types';

function makeManifest(id: string, o: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id,
    name: `Plugin ${id}`,
    version: '1.0.0',
    author: 'Test',
    permissions: ['notifications'],
    actions: ['do.thing'],
    hooks: ['task.created'],
    settings: {},
    icon: '🔌',
    category: 'other',
    ...o,
  };
}

describe('Plugin Registry — manifest doğrulama', () => {
  it('geçerli manifest doğrulanır', () => {
    expect(validateManifest(makeManifest('valid-plugin')).valid).toBe(true);
  });

  it('geçersiz id/version reddedilir', () => {
    expect(validateManifest({ ...makeManifest('X'), id: 'BAD ID' }).valid).toBe(false);
    expect(validateManifest({ ...makeManifest('v'), version: '1.0' }).valid).toBe(false);
  });

  it('zorunlu alan eksik → hata listesi', () => {
    const r = validateManifest({ id: 'noicon' });
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('Plugin Lifecycle — install/enable/disable/update/uninstall', () => {
  const ID = `lc-${Date.now()}`;
  beforeEach(() => {
    removePlugin(ID);
  });

  it('install kurar (installed state)', () => {
    const r = installPlugin(makeManifest(ID));
    expect(r.ok).toBe(true);
    expect(r.plugin!.state).toBe('installed');
  });

  it('çift install reddedilir', () => {
    installPlugin(makeManifest(ID));
    const r = installPlugin(makeManifest(ID));
    expect(r.ok).toBe(false);
  });

  it('enable → enabled, disable → disabled', () => {
    installPlugin(makeManifest(ID));
    expect(enablePlugin(ID)!.state).toBe('enabled');
    expect(disablePlugin(ID)!.state).toBe('disabled');
  });

  it('update version değiştirir, id değişemez', () => {
    installPlugin(makeManifest(ID));
    const r = updatePluginVersion(ID, makeManifest(ID, { version: '2.0.0' }));
    expect(r.ok).toBe(true);
    expect(getPlugin(ID)!.manifest.version).toBe('2.0.0');
    const bad = updatePluginVersion(ID, makeManifest('other-id'));
    expect(bad.ok).toBe(false);
  });

  it('reload → enabled + hata temizlenir', () => {
    installPlugin(makeManifest(ID));
    const r = reloadPlugin(ID);
    expect(r!.state).toBe('enabled');
  });

  it('uninstall kaldırır', () => {
    installPlugin(makeManifest(ID));
    expect(uninstallPlugin(ID)).toBe(true);
    expect(getPlugin(ID)).toBeNull();
  });

  it('health durumu döner', () => {
    installPlugin(makeManifest(ID));
    expect(checkPluginHealth(ID)!.health).toBe('healthy');
  });
});

describe('Permission Engine — izinsiz erişim yok', () => {
  const ID = `perm-${Date.now()}`;
  beforeEach(() => {
    removePlugin(ID);
    installPlugin(makeManifest(ID, { permissions: ['trading', 'notifications'] }));
    enablePlugin(ID);
  });

  it('yalnız manifest izinleri verilebilir', () => {
    const r = grantPermissions(ID, ['trading', 'desktop']);
    expect(r.granted).toContain('trading');
    expect(r.denied).toContain('desktop'); // manifest'te yok
  });

  it('grant sonrası checkPermission true', () => {
    grantPermissions(ID, ['trading']);
    expect(checkPermission(ID, 'trading')).toBe(true);
    expect(checkPermission(ID, 'commerce')).toBe(false);
  });

  it('disabled plugin erişemez', () => {
    grantPermissions(ID, ['trading']);
    disablePlugin(ID);
    expect(checkPermission(ID, 'trading')).toBe(false);
  });

  it('requirePermission izin yoksa fırlatır', () => {
    expect(() => requirePermission(ID, 'commerce')).toThrow(PermissionDeniedError);
  });

  it('registry metrics durum sayar', () => {
    const m = getRegistryMetrics();
    expect(m.total).toBeGreaterThan(0);
  });
});
