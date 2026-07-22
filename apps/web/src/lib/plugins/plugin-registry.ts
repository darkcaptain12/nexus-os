import type { InstalledPlugin, PluginManifest, PluginLifecycleState } from './types';

// Plugin Registry — kurulu pluginler. globalThis singleton (mevcut registry
// pattern: exchanges/ocr/stt/discovery ile aynı). Ring buffer.

const MAX_PLUGINS = 200;
const g = globalThis as unknown as { __apexPlugins?: Map<string, InstalledPlugin> };

function store(): Map<string, InstalledPlugin> {
  if (!g.__apexPlugins) g.__apexPlugins = new Map();
  return g.__apexPlugins;
}

export function addPlugin(plugin: InstalledPlugin): void {
  const s = store();
  s.set(plugin.manifest.id, plugin);
  if (s.size > MAX_PLUGINS) {
    const oldest = [...s.values()].sort((a, b) => a.installedAt.localeCompare(b.installedAt))[0];
    if (oldest) s.delete(oldest.manifest.id);
  }
}

export function getPlugin(id: string): InstalledPlugin | null {
  return store().get(id) ?? null;
}

export function updatePlugin(id: string, patch: Partial<InstalledPlugin>): InstalledPlugin | null {
  const p = store().get(id);
  if (!p) return null;
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  return p;
}

export function removePlugin(id: string): boolean {
  return store().delete(id);
}

export function listPlugins(state?: PluginLifecycleState): InstalledPlugin[] {
  const all = [...store().values()];
  return state ? all.filter((p) => p.state === state) : all;
}

export function pluginExists(id: string): boolean {
  return store().has(id);
}

/** Manifest doğrulama — zorunlu alanlar. */
export function validateManifest(m: Partial<PluginManifest>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!m.id || !/^[a-z0-9][a-z0-9-]{1,49}$/.test(m.id)) errors.push('Geçersiz id (a-z0-9-, 2-50)');
  if (!m.name) errors.push('name zorunlu');
  if (!m.version || !/^\d+\.\d+\.\d+$/.test(m.version))
    errors.push('version semver olmalı (x.y.z)');
  if (!m.author) errors.push('author zorunlu');
  if (!Array.isArray(m.permissions)) errors.push('permissions dizi olmalı');
  if (!m.icon) errors.push('icon zorunlu');
  if (!m.category) errors.push('category zorunlu');
  return { valid: errors.length === 0, errors };
}

export function getRegistryMetrics(): {
  total: number;
  byState: Record<string, number>;
  totalInvocations: number;
} {
  const all = [...store().values()];
  const byState: Record<string, number> = {};
  let totalInvocations = 0;
  for (const p of all) {
    byState[p.state] = (byState[p.state] ?? 0) + 1;
    totalInvocations += p.invocationCount;
  }
  return { total: all.length, byState, totalInvocations };
}
