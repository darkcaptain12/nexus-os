import type { PluginPermission } from './types';
import { getPlugin, updatePlugin } from './plugin-registry';

// Permission Engine — 9 izin. İzin verilmeden erişim YOK. Sandbox context
// bu motoru kullanarak her API çağrısını kontrol eder.

export const ALL_PERMISSIONS: PluginPermission[] = [
  'trading',
  'commerce',
  'desktop',
  'voice',
  'filesystem',
  'clipboard',
  'notifications',
  'workflow',
  'network',
];

export function isValidPermission(p: string): p is PluginPermission {
  return (ALL_PERMISSIONS as string[]).includes(p);
}

/** Plugin'e izin ver — yalnız manifest'te talep edilenler verilebilir. */
export function grantPermissions(
  pluginId: string,
  permissions: PluginPermission[],
): { granted: PluginPermission[]; denied: PluginPermission[] } {
  const plugin = getPlugin(pluginId);
  if (!plugin) return { granted: [], denied: permissions };

  const requested = new Set(plugin.manifest.permissions);
  const granted: PluginPermission[] = [];
  const denied: PluginPermission[] = [];
  for (const p of permissions) {
    if (requested.has(p)) granted.push(p);
    else denied.push(p); // manifest'te talep edilmemiş izin verilemez
  }
  const merged = [...new Set([...plugin.grantedPermissions, ...granted])];
  updatePlugin(pluginId, { grantedPermissions: merged });
  return { granted, denied };
}

export function revokePermission(pluginId: string, permission: PluginPermission): boolean {
  const plugin = getPlugin(pluginId);
  if (!plugin) return false;
  updatePlugin(pluginId, {
    grantedPermissions: plugin.grantedPermissions.filter((p) => p !== permission),
  });
  return true;
}

/** Erişim kontrolü — izin yoksa false. Sandbox her API çağrısında çağırır. */
export function checkPermission(pluginId: string, permission: PluginPermission): boolean {
  const plugin = getPlugin(pluginId);
  if (!plugin) return false;
  if (plugin.state !== 'enabled') return false; // disabled plugin erişemez
  return plugin.grantedPermissions.includes(permission);
}

export class PermissionDeniedError extends Error {
  constructor(pluginId: string, permission: PluginPermission) {
    super(`Plugin '${pluginId}' için '${permission}' izni yok — erişim reddedildi`);
    this.name = 'PermissionDeniedError';
  }
}

/** İzin zorunlu kılan guard — yoksa fırlatır (sandbox kullanır). */
export function requirePermission(pluginId: string, permission: PluginPermission): void {
  if (!checkPermission(pluginId, permission)) {
    throw new PermissionDeniedError(pluginId, permission);
  }
}
