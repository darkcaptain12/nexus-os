import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Documentation Audit — kurulum/güncelleme/backup/recovery/trading/commerce/
// voice/mobile/plugin dokümanlarının varlığını GERÇEK fs kontrolü ile doğrular.
// Eksik doküman raporlanır (gizlenmez). Node runtime (fs erişimi).

export interface DocItem {
  name: string;
  path: string;
  present: boolean;
  required: boolean;
}

export interface DocumentationReport {
  score: number;
  present: number;
  total: number;
  items: DocItem[];
  missing: string[];
  generatedAt: string;
}

// Repo kök adayları — Next cwd apps/web olabilir, monorepo kökü üstte.
const ROOT_CANDIDATES = [process.cwd(), join(process.cwd(), '..', '..'), join(process.cwd(), '..')];

function resolveExists(relPath: string): boolean {
  return ROOT_CANDIDATES.some((root) => {
    try {
      return existsSync(join(root, relPath));
    } catch {
      return false;
    }
  });
}

const DOC_SPECS: { name: string; path: string; required: boolean }[] = [
  { name: 'README', path: 'README.md', required: true },
  { name: 'CHANGELOG', path: 'CHANGELOG.md', required: true },
  { name: 'LICENSE', path: 'LICENSE', required: true },
  { name: 'ENV Example', path: '.env.example', required: true },
  { name: 'Migration Guide', path: 'docs/MIGRATION.md', required: true },
  { name: 'Kurulum', path: 'docs/installation.md', required: true },
  { name: 'CLAUDE.md (mimari)', path: 'CLAUDE.md', required: true },
  { name: 'Trading Doc', path: 'docs/trading.md', required: false },
  { name: 'Commerce Doc', path: 'docs/commerce.md', required: false },
  { name: 'Voice Doc', path: 'docs/voice.md', required: false },
  { name: 'Mobile Doc', path: 'docs/mobile.md', required: false },
  { name: 'Plugin SDK Doc', path: 'apps/web/src/lib/plugins/README.md', required: false },
  { name: 'Backup/Recovery Doc', path: 'apps/web/src/lib/cloud/README.md', required: false },
];

export function auditDocumentation(): DocumentationReport {
  const items: DocItem[] = DOC_SPECS.map((spec) => ({
    name: spec.name,
    path: spec.path,
    present: resolveExists(spec.path),
    required: spec.required,
  }));

  const present = items.filter((i) => i.present).length;
  const missing = items.filter((i) => !i.present).map((i) => `${i.name} (${i.path})`);
  // Skor: zorunlu eksikler ağır cezalı
  const requiredMissing = items.filter((i) => i.required && !i.present).length;
  const score = Math.max(0, Math.round((present / items.length) * 100) - requiredMissing * 5);

  return {
    score,
    present,
    total: items.length,
    items,
    missing,
    generatedAt: new Date().toISOString(),
  };
}
