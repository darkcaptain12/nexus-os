import type { ActiveWindow } from '../types';

export async function getActiveWindow(): Promise<ActiveWindow | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const activeWin = require('active-win') as {
      (): Promise<
        | {
            owner: { name: string; processId: number; path: string; bundleId?: string };
            title: string;
          }
        | undefined
      >;
    };
    const win = await activeWin();
    if (!win) return null;
    return {
      app: win.owner.name,
      title: win.title,
      pid: win.owner.processId,
      bundleId: win.owner.bundleId,
      path: win.owner.path,
    };
  } catch {
    return null;
  }
}
