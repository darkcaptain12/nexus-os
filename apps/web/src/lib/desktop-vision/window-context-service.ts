import type { WindowContext, ScreenContext } from './types';
import { analyzeIde } from './ide-insight';
import { analyzeBrowser } from './browser-insight';

// Window Context Service — aktif pencere durumunu birleştirir (IDE + browser +
// screen). Aktif proje çıkarımı için tek kaynak. Context Builder v3'e girer.

const g = globalThis as unknown as { __apexWindowContext?: WindowContext };

/** En son ekran bağlamıyla birleşik pencere durumu üret ve sakla. */
export function updateWindowContext(input: {
  app: string;
  windowTitle: string;
  screen?: ScreenContext | null;
}): WindowContext {
  const ide = analyzeIde(input.app, input.windowTitle);
  const browser = analyzeBrowser(input.app, input.windowTitle);

  // Aktif proje: IDE projesi > ekran bağlamındaki proje entity'si
  let activeProject: string | null = ide?.project ?? null;
  if (!activeProject && input.screen) {
    const projEntity = input.screen.entities.find((e) => e.role === 'project');
    if (projEntity) activeProject = projEntity.name;
  }

  const context: WindowContext = {
    activeApp: input.app,
    activeWindowTitle: input.windowTitle,
    ide,
    browser,
    screen: input.screen ?? null,
    activeProject,
    updatedAt: new Date().toISOString(),
  };

  g.__apexWindowContext = context;
  return context;
}

export function getWindowContext(): WindowContext | null {
  return g.__apexWindowContext ?? null;
}

export function getActiveProject(): string | null {
  return g.__apexWindowContext?.activeProject ?? null;
}
