import type { IdeInsight, KnownIde } from './types';

// IDE Intelligence — aktif pencereden IDE + proje/dosya/dil/branch/hata/build.
// Mevcut desktop-agent ide-collector'ı window title parse eder; bu servis web
// tarafında ek sinyalleri (hata sayısı, build durumu) da işler ve KG'ye hazırlar.

const IDE_MAP: { match: RegExp; ide: KnownIde; name: string }[] = [
  { match: /cursor/i, ide: 'cursor', name: 'Cursor' },
  { match: /claude|claude code/i, ide: 'claude-code', name: 'Claude Code' },
  { match: /visual studio code|vscode|^code$/i, ide: 'vscode', name: 'VS Code' },
  { match: /terminal|iterm|warp|alacritty|kitty|wezterm/i, ide: 'terminal', name: 'Terminal' },
];

const LANG_BY_EXT: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  rb: 'Ruby',
  java: 'Java',
  swift: 'Swift',
  kt: 'Kotlin',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  md: 'Markdown',
  sql: 'SQL',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  sh: 'Shell',
  vue: 'Vue',
  php: 'PHP',
};

function detectIdeKind(app: string, title: string): { ide: KnownIde; name: string } | null {
  for (const entry of IDE_MAP) {
    if (entry.match.test(app) || entry.match.test(title)) {
      return { ide: entry.ide, name: entry.name };
    }
  }
  return null;
}

export function analyzeIde(app: string, windowTitle: string): IdeInsight | null {
  const kind = detectIdeKind(app, windowTitle);
  if (!kind) return null;

  const insight: IdeInsight = {
    ide: kind.ide,
    ideName: kind.name,
    detectedAt: new Date().toISOString(),
    buildStatus: 'unknown',
  };

  const title = windowTitle;

  // VS Code / Cursor başlık formatı: "file.ts — project" veya "file.ts — project — branch"
  const parts = title
    .split(/\s+[—–-]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const fileCandidate = parts[0]!;
    if (/\.\w+$/.test(fileCandidate) || fileCandidate.includes('.')) {
      insight.activeFile = fileCandidate.replace(/^[●•*]\s*/, '');
      const ext = insight.activeFile.split('.').pop()?.toLowerCase();
      if (ext && LANG_BY_EXT[ext]) insight.language = LANG_BY_EXT[ext];
    }
    // "file — project" veya "file — project — branch/status": proje her zaman parts[1].
    // Branch parens/"on X" regex'inden alınır (parça[2] hata/build metni olabilir).
    insight.project = parts[1]!.replace(/\s*\(.*\)$/, '');
  }

  // Git branch: "(branch)" veya "on branch"
  const branchMatch = title.match(/\(([^)]+)\)|on\s+(\S+)/i);
  if (branchMatch) insight.gitBranch = (branchMatch[1] ?? branchMatch[2])?.trim();

  // Hata sayısı: "3 errors" / "✗ 5" / "3 problems"
  const errMatch = title.match(/(\d+)\s*(?:errors?|problems?)|[✗✕]\s*(\d+)/i);
  if (errMatch) {
    insight.errorCount = parseInt(errMatch[1] ?? errMatch[2] ?? '0', 10);
    insight.buildStatus = insight.errorCount > 0 ? 'failing' : 'passing';
  }

  // Build durumu göstergeleri
  if (/building|compiling/i.test(title)) insight.buildStatus = 'building';
  else if (/build (?:passed|success|✓)|passing/i.test(title)) insight.buildStatus = 'passing';
  else if (/build (?:failed|error)|failing/i.test(title)) insight.buildStatus = 'failing';

  // Terminal: unмодifiye başlıktan branch/dizin
  if (kind.ide === 'terminal' && !insight.project) {
    const pathMatch = title.match(/([\w-]+)\s*[—–-]/);
    if (pathMatch) insight.project = pathMatch[1];
  }

  return insight;
}
