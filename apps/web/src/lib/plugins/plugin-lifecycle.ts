import type { InstalledPlugin, PluginManifest } from './types';
import {
  addPlugin,
  getPlugin,
  updatePlugin,
  removePlugin,
  validateManifest,
  pluginExists,
} from './plugin-registry';
import { grantPermissions } from './permission-engine';
import { unsubscribeAll } from './event-hooks';
import { recordPlugin } from '@/lib/knowledge/auto-linker';
import { getMemoryStore } from '@/lib/memory/store';

// Plugin Lifecycle — install/enable/disable/update/uninstall/health/reload.
// Güvenli yaşam döngüsü + izin kontrolleri. Knowledge Graph + Memory bağlar.

export interface InstallResult {
  ok: boolean;
  plugin?: InstalledPlugin;
  errors?: string[];
}

export function installPlugin(manifest: PluginManifest, grantAll = false): InstallResult {
  const validation = validateManifest(manifest);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  if (pluginExists(manifest.id)) return { ok: false, errors: ['Plugin zaten kurulu'] };

  const now = new Date().toISOString();
  const plugin: InstalledPlugin = {
    manifest,
    state: 'installed',
    grantedPermissions: [],
    settingsValues: Object.fromEntries(
      Object.entries(manifest.settings).map(([k, v]) => [k, v.default ?? null]),
    ),
    installedAt: now,
    updatedAt: now,
    healthStatus: 'healthy',
    invocationCount: 0,
  };
  addPlugin(plugin);

  // İzinler yalnız kullanıcı onayıyla (grantAll test/opsiyonel)
  if (grantAll) grantPermissions(manifest.id, manifest.permissions);

  recordPlugin({
    id: manifest.id,
    name: manifest.name,
    category: manifest.category,
    actions: manifest.actions,
  });
  getMemoryStore().addTimelineEntry({
    source: 'system',
    title: `Plugin kuruldu: ${manifest.name}`,
    description: `v${manifest.version} · ${manifest.author} · ${manifest.permissions.length} izin talep edildi`,
    timestamp: now,
    metadata: { pluginId: manifest.id, category: manifest.category },
  });
  return { ok: true, plugin };
}

export function enablePlugin(id: string): InstalledPlugin | null {
  const p = getPlugin(id);
  if (!p || p.state === 'uninstalled') return null;
  return updatePlugin(id, { state: 'enabled', healthStatus: 'healthy' });
}

export function disablePlugin(id: string): InstalledPlugin | null {
  const p = getPlugin(id);
  if (!p) return null;
  unsubscribeAll(id); // hook'ları kaldır
  return updatePlugin(id, { state: 'disabled' });
}

export function updatePluginVersion(id: string, newManifest: PluginManifest): InstallResult {
  const p = getPlugin(id);
  if (!p) return { ok: false, errors: ['Plugin bulunamadı'] };
  const validation = validateManifest(newManifest);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  if (newManifest.id !== id) return { ok: false, errors: ['id değiştirilemez'] };

  const updated = updatePlugin(id, { manifest: newManifest, healthStatus: 'healthy' });
  return { ok: true, plugin: updated ?? undefined };
}

export function uninstallPlugin(id: string): boolean {
  const p = getPlugin(id);
  if (!p) return false;
  unsubscribeAll(id);
  updatePlugin(id, { state: 'uninstalled' });
  return removePlugin(id);
}

export function reloadPlugin(id: string): InstalledPlugin | null {
  const p = getPlugin(id);
  if (!p) return null;
  unsubscribeAll(id);
  return updatePlugin(id, { state: 'enabled', healthStatus: 'healthy', lastError: undefined });
}

export function checkPluginHealth(
  id: string,
): { id: string; health: string; state: string; error?: string } | null {
  const p = getPlugin(id);
  if (!p) return null;
  return { id, health: p.healthStatus, state: p.state, error: p.lastError };
}
