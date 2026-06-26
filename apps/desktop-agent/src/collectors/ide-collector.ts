import type { ActiveWindow, IDEState } from '../types';

const IDE_APPS = new Set([
  'Code', 'Visual Studio Code', 'VSCodium',
  'IntelliJ IDEA', 'WebStorm', 'PyCharm', 'GoLand', 'PhpStorm', 'RustRover',
  'Xcode', 'Android Studio', 'Cursor', 'Zed', 'Sublime Text', 'Neovim',
]);

export function detectIDE(window: ActiveWindow | null): IDEState | null {
  if (!window) return null;
  if (!IDE_APPS.has(window.app)) return null;

  const state: IDEState = {
    ide: window.app,
    openFileCount: 0,
  };

  const title = window.title;

  if (window.app === 'Code' || window.app === 'Visual Studio Code' || window.app === 'Cursor') {
    const parts = title.split(' — ');
    if (parts.length >= 3) {
      state.workspace = parts[parts.length - 2]?.trim();
      state.project = state.workspace;
    } else if (parts.length === 2) {
      state.workspace = parts[1]?.trim();
      state.project = state.workspace;
    }
    const fileMatch = title.match(/^(.+?)\s/);
    if (fileMatch) {
      const fileName = fileMatch[1] ?? '';
      state.language = detectLanguage(fileName);
    }
    const branchMatch = title.match(/\(([^)]+)\)/);
    if (branchMatch) {
      state.gitBranch = branchMatch[1];
    }
  }

  return state;
}

function detectLanguage(fileName: string): string | undefined {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby', java: 'Java',
    swift: 'Swift', kt: 'Kotlin', cs: 'C#', cpp: 'C++', c: 'C',
    html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', md: 'Markdown',
    sql: 'SQL', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  };
  return ext ? langMap[ext] : undefined;
}
