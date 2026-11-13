import type { ClipboardEntry, ClipboardKind, ClipboardIngestResult } from './types';
import { classifyContent } from './content-classifier';
import { getMemoryStore } from '@/lib/memory/store';
import { recordClipboard } from '@/lib/knowledge/auto-linker';

// Clipboard Intelligence — değişince metin/kod/link/dosya-yolu algılar,
// gereksiz tekrarları filtreler (hash dedup), Memory Engine'e entegre eder,
// Knowledge Graph'a bağlar. Yeni memory sistemi YOK — mevcut MemoryStore.

const MAX_HISTORY = 200;
// Son N hash'i tut — kısa süreli tekrarları filtrele (Ctrl+C spam)
const DEDUP_WINDOW = 20;

const g = globalThis as unknown as {
  __apexClipboard?: { history: ClipboardEntry[]; recentHashes: string[] };
};

function store(): { history: ClipboardEntry[]; recentHashes: string[] } {
  if (!g.__apexClipboard) g.__apexClipboard = { history: [], recentHashes: [] };
  return g.__apexClipboard;
}

function hashContent(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) h = (Math.imul(31, h) + content.charCodeAt(i)) | 0;
  return `${content.length}:${h}`;
}

const URL_RE = /^https?:\/\/[^\s]+$/;
const FILEPATH_RE = /^(?:\/[\w.-]+)+\/?$|^[A-Za-z]:\\[\w\\.-]+$|^~\/[\w./-]+$/;

export function classifyClipboard(content: string, sourceApp?: string): ClipboardKind {
  const trimmed = content.trim();
  if (trimmed.length === 0) return 'empty';
  if (URL_RE.test(trimmed)) return 'link';
  if (FILEPATH_RE.test(trimmed) && !trimmed.includes(' ')) return 'filepath';
  const kind = classifyContent(trimmed, { app: sourceApp });
  if (kind === 'code' || kind === 'json' || kind === 'xml' || kind === 'terminal') return 'code';
  return 'text';
}

function detectCodeLanguage(content: string): string | undefined {
  if (/\b(function|const|=>|import .* from)\b/.test(content)) return 'JavaScript/TypeScript';
  if (/\bdef \w+\(|import \w+$|print\(/m.test(content)) return 'Python';
  if (/^\s*<\?xml|<[a-z]+>/i.test(content)) return 'XML';
  if (/^\s*[{[]/.test(content.trim())) return 'JSON';
  if (/\b(SELECT|INSERT|UPDATE|DELETE) .+ (FROM|INTO|SET)\b/i.test(content)) return 'SQL';
  return undefined;
}

/**
 * Clipboard değişimini işle. Tekrar (son DEDUP_WINDOW içinde aynı hash) filtrelenir.
 * Yeni içerik Memory timeline'a + Knowledge Graph'a yazılır.
 */
export function ingestClipboard(content: string, sourceApp?: string): ClipboardIngestResult {
  const st = store();
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { entry: null, duplicate: false, reason: 'boş içerik' };
  }

  const hash = hashContent(trimmed);
  if (st.recentHashes.includes(hash)) {
    return { entry: null, duplicate: true, reason: 'yakın zamanda kopyalandı' };
  }

  const kind = classifyClipboard(trimmed, sourceApp);
  const entry: ClipboardEntry = {
    id: crypto.randomUUID(),
    content: trimmed.slice(0, 5000),
    kind,
    hash,
    sourceApp,
    language: kind === 'code' ? detectCodeLanguage(trimmed) : undefined,
    createdAt: new Date().toISOString(),
  };

  st.history.push(entry);
  if (st.history.length > MAX_HISTORY) st.history.shift();
  st.recentHashes.push(hash);
  if (st.recentHashes.length > DEDUP_WINDOW) st.recentHashes.shift();

  // Memory Engine entegrasyonu (mevcut MemoryStore)
  getMemoryStore().addTimelineEntry({
    source: 'desktop',
    title: `Clipboard: ${kind}${entry.language ? ` (${entry.language})` : ''}`,
    description: trimmed.slice(0, 200),
    timestamp: entry.createdAt,
    metadata: { clipboardId: entry.id, kind, sourceApp },
  });

  // Knowledge Graph entegrasyonu
  recordClipboard({ kind, content: trimmed, sourceApp });

  return { entry, duplicate: false };
}

export function getClipboardHistory(limit = 30): ClipboardEntry[] {
  return store().history.slice(-limit).reverse();
}

export function getClipboardStats(): { total: number; byKind: Record<ClipboardKind, number> } {
  const history = store().history;
  const byKind = { text: 0, code: 0, link: 0, filepath: 0, empty: 0 } as Record<
    ClipboardKind,
    number
  >;
  for (const e of history) byKind[e.kind]++;
  return { total: history.length, byKind };
}
