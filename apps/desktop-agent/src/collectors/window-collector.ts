import type { ActiveWindow } from '../types';

export async function getActiveWindow(): Promise<ActiveWindow | null> {
  try {
    const mod = await import('active-win');
    const win = await mod.default();
    if (!win) return null;
    return {
      app: win.owner.name,
      title: win.title,
      pid: win.owner.processId,
      bundleId: 'bundleId' in win.owner ? (win.owner as Record<string, string>).bundleId : undefined,
      path: win.owner.path,
    };
  } catch {
    return null;
  }
}
