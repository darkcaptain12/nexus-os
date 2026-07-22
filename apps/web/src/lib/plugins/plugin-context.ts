import type { PluginContextApi, PluginPermission } from './types';
import { checkPermission, requirePermission } from './permission-engine';
import { getPlugin, updatePlugin } from './plugin-registry';

// Plugin Context — Public SDK yüzeyi. Plugin DOĞRUDAN sisteme erişemez; yalnız
// bu context üzerinden, her çağrı izin-kontrollü. Mevcut servisleri sarar (reuse).
// İzin verilmemiş yüzey undefined (erişilemez).

export function buildPluginContext(pluginId: string): PluginContextApi {
  const bump = () => {
    const p = getPlugin(pluginId);
    if (p) updatePlugin(pluginId, { invocationCount: p.invocationCount + 1 });
  };

  const ctx: PluginContextApi = {
    pluginId,
    hasPermission: (permission: PluginPermission) => checkPermission(pluginId, permission),
  };

  // notifications izni → push (mevcut mobile notification-center reuse)
  if (checkPermission(pluginId, 'notifications')) {
    ctx.notifications = {
      push: (title: string, body: string) => {
        requirePermission(pluginId, 'notifications');
        // lazy import — mevcut push engine reuse
        void import('@/lib/mobile/notification-center').then((m) =>
          m.pushNotification({ category: 'agent', title: `[${pluginId}] ${title}`, body }),
        );
        bump();
      },
    };
  }

  // workflow izni → agent create (mevcut Agent Runtime reuse)
  if (checkPermission(pluginId, 'workflow')) {
    ctx.agent = {
      create: (name: string, goal: string) => {
        requirePermission(pluginId, 'workflow');
        bump();
        return { queued: true, name, goal }; // gerçek agent lazy tetiklenir (sandbox güvenli)
      },
    };
    ctx.workflow = () => {
      requirePermission(pluginId, 'workflow');
      bump();
      return { available: true };
    };
  }

  // trading izni → trading summary (mevcut quant reuse, read-only)
  if (checkPermission(pluginId, 'trading')) {
    ctx.trading = async () => {
      requirePermission(pluginId, 'trading');
      bump();
      const m = await import('@/lib/quant/services/quant-service');
      return m.getTradingStatusSummary();
    };
  }

  // commerce izni → commerce dashboard (read-only)
  if (checkPermission(pluginId, 'commerce')) {
    ctx.commerce = async () => {
      requirePermission(pluginId, 'commerce');
      bump();
      const m = await import('@/lib/commerce/intelligence/services/commerce-intelligence-service');
      return m.commerceDashboard();
    };
  }

  // desktop izni → desktop context (read-only)
  if (checkPermission(pluginId, 'desktop')) {
    ctx.desktop = () => {
      requirePermission(pluginId, 'desktop');
      bump();
      return { available: true };
    };
  }

  // voice izni
  if (checkPermission(pluginId, 'voice')) {
    ctx.voice = () => {
      requirePermission(pluginId, 'voice');
      bump();
      return { available: true };
    };
  }

  return ctx;
}
