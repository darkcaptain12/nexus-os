import type { DeveloperDashboard, PluginManifest, PluginPermission, HookEvent } from '../types';
import { listPlugins, getPlugin, getRegistryMetrics } from '../plugin-registry';
import {
  installPlugin,
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  reloadPlugin,
  checkPluginHealth,
  updatePluginVersion,
} from '../plugin-lifecycle';
import { grantPermissions, revokePermission } from '../permission-engine';
import {
  getMarketplaceListings,
  marketplaceInstall,
  marketplaceRemove,
  marketplaceUpdate,
  getMarketplaceCount,
} from '../marketplace';
import { getHookStats, subscribeHook, emitHook } from '../event-hooks';
import { getWebhookQueueLength, getWebhooks } from '../webhooks';
import { runInSandbox } from '../plugin-sandbox';

// Developer Platform Service — mobil/dashboard facade. Düz JSON. Plugin SDK +
// Marketplace + Permission + Hooks + Sandbox tek yüzeyde.

export function devInstall(manifest: PluginManifest, grantAll = false) {
  return installPlugin(manifest, grantAll);
}
export function devEnable(id: string) {
  return enablePlugin(id);
}
export function devDisable(id: string) {
  return disablePlugin(id);
}
export function devUninstall(id: string) {
  return uninstallPlugin(id);
}
export function devReload(id: string) {
  return reloadPlugin(id);
}
export function devUpdate(id: string, manifest: PluginManifest) {
  return updatePluginVersion(id, manifest);
}
export function devHealth(id: string) {
  return checkPluginHealth(id);
}
export function devPlugins(state?: Parameters<typeof listPlugins>[0]) {
  return listPlugins(state);
}
export function devPlugin(id: string) {
  return getPlugin(id);
}

export function devGrant(id: string, permissions: PluginPermission[]) {
  return grantPermissions(id, permissions);
}
export function devRevoke(id: string, permission: PluginPermission) {
  return revokePermission(id, permission);
}

export function devMarketplace(
  category?: Parameters<typeof getMarketplaceListings>[0],
  search?: string,
) {
  return getMarketplaceListings(category, search);
}
export function devMarketplaceInstall(id: string, grantAll = false) {
  return marketplaceInstall(id, grantAll);
}
export function devMarketplaceRemove(id: string) {
  return marketplaceRemove(id);
}
export function devMarketplaceUpdate(id: string) {
  return marketplaceUpdate(id);
}

export function devSubscribeHook(
  pluginId: string,
  event: HookEvent,
  handler: (e: HookEvent, p: Record<string, unknown>) => void,
) {
  subscribeHook(pluginId, event, handler);
}
export function devEmitHook(event: HookEvent, payload?: Record<string, unknown>) {
  return emitHook(event, payload);
}
export function devRunSandbox(pluginId: string, fn: Parameters<typeof runInSandbox>[1]) {
  return runInSandbox(pluginId, fn);
}

/** Developer Dashboard — plugin sayısı/aktif/disabled/health/API usage/event rate/webhook queue/marketplace. */
export function devDashboard(): DeveloperDashboard {
  const all = listPlugins();
  const metrics = getRegistryMetrics();
  const hookStats = getHookStats();

  const topPlugins = [...all]
    .sort((a, b) => b.invocationCount - a.invocationCount)
    .slice(0, 5)
    .map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      invocations: p.invocationCount,
      health: p.healthStatus,
    }));

  return {
    totalPlugins: metrics.total,
    enabledPlugins: metrics.byState.enabled ?? 0,
    disabledPlugins: metrics.byState.disabled ?? 0,
    errorPlugins: metrics.byState.error ?? 0,
    apiUsageTotal: metrics.totalInvocations,
    eventRate: hookStats.eventRate,
    webhookQueueLength: getWebhookQueueLength(),
    marketplaceCount: getMarketplaceCount(),
    topPlugins,
    generatedAt: new Date().toISOString(),
  };
}

// Mobil kompakt görünüm (plugin listesi/izinler)
export function devMobileView() {
  return {
    installed: listPlugins().map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      state: p.state,
      permissions: p.grantedPermissions,
      health: p.healthStatus,
    })),
    marketplaceCount: getMarketplaceCount(),
    webhooks: getWebhooks().length,
  };
}
