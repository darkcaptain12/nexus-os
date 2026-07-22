import type { PluginContextApi } from './types';
import { getPlugin } from './plugin-registry';
import { buildPluginContext } from './plugin-context';
import { PermissionDeniedError } from './permission-engine';

// Plugin Sandbox — plugin kodunu izole çalıştırır. Plugin sisteme DOĞRUDAN
// erişemez; yalnız PluginContext geçirilir. İzin ihlali yakalanır, plugin
// hata durumuna geçer (diğer pluginleri etkilemez — isolation).

export interface SandboxResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  permissionDenied?: boolean;
}

/**
 * Plugin fonksiyonunu sandbox'ta çalıştır — yalnız context erişilir.
 * Hata plugin'i izole eder (throw dışarı sızmaz).
 */
export async function runInSandbox<T>(
  pluginId: string,
  fn: (ctx: PluginContextApi) => Promise<T> | T,
): Promise<SandboxResult<T>> {
  const plugin = getPlugin(pluginId);
  if (!plugin) return { ok: false, error: 'Plugin bulunamadı' };
  if (plugin.state !== 'enabled')
    return { ok: false, error: `Plugin ${plugin.state} durumunda — çalıştırılamaz` };

  const ctx = buildPluginContext(pluginId);
  try {
    const value = await fn(ctx);
    return { ok: true, value };
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      return { ok: false, error: err.message, permissionDenied: true };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
