import type { HookEvent } from './types';
import { getPlugin, updatePlugin, listPlugins } from './plugin-registry';

// Event Hooks — plugin'ler 10 event dinler. Mevcut modüller emitHook çağırır.
// Event-driven, poll yok. Handler'lar izin-kontrollü (yalnız enabled plugin).

type HookHandler = (event: HookEvent, payload: Record<string, unknown>) => void;

const g = globalThis as unknown as {
  __apexHookSubscribers?: Map<string, Map<HookEvent, HookHandler>>;
  __apexHookStats?: { total: number; windowStart: number; windowCount: number };
};

function subscribers(): Map<string, Map<HookEvent, HookHandler>> {
  if (!g.__apexHookSubscribers) g.__apexHookSubscribers = new Map();
  return g.__apexHookSubscribers;
}

export function subscribeHook(pluginId: string, event: HookEvent, handler: HookHandler): void {
  const s = subscribers();
  if (!s.has(pluginId)) s.set(pluginId, new Map());
  s.get(pluginId)!.set(event, handler);
}

export function unsubscribeAll(pluginId: string): void {
  subscribers().delete(pluginId);
}

/** Mevcut modüller çağırır (task.create/trade.opened/product.published...).
 *  Yalnız enabled + hook'u manifest'te olan plugin'lere iletilir. */
export function emitHook(event: HookEvent, payload: Record<string, unknown> = {}): number {
  const stats = g.__apexHookStats ?? { total: 0, windowStart: Date.now(), windowCount: 0 };
  stats.total++;
  // Event rate penceresi (60s)
  if (Date.now() - stats.windowStart > 60_000) {
    stats.windowStart = Date.now();
    stats.windowCount = 0;
  }
  stats.windowCount++;
  g.__apexHookStats = stats;

  let delivered = 0;
  for (const [pluginId, events] of subscribers()) {
    const handler = events.get(event);
    if (!handler) continue;
    const plugin = getPlugin(pluginId);
    if (!plugin || plugin.state !== 'enabled') continue;
    if (!plugin.manifest.hooks.includes(event)) continue;
    try {
      handler(event, payload);
      updatePlugin(pluginId, { invocationCount: plugin.invocationCount + 1 });
      delivered++;
    } catch (err) {
      updatePlugin(pluginId, {
        healthStatus: 'error',
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return delivered;
}

export function getEventRate(): number {
  const stats = g.__apexHookStats;
  if (!stats) return 0;
  const elapsed = Math.max(1, (Date.now() - stats.windowStart) / 1000);
  return Number((stats.windowCount / elapsed).toFixed(2));
}

export function getHookStats(): {
  totalEmitted: number;
  eventRate: number;
  activeSubscribers: number;
} {
  return {
    totalEmitted: g.__apexHookStats?.total ?? 0,
    eventRate: getEventRate(),
    activeSubscribers: [...subscribers().keys()].filter((id) =>
      listPlugins('enabled').some((p) => p.manifest.id === id),
    ).length,
  };
}
