import type { FileInsightRequest, FileInsight } from './types';
import { fileTypeFromName, detectLanguage, classifyContent } from './content-classifier';
import { extractEntities } from '@/lib/memory/entity-extractor';
import { getMemoryStore } from '@/lib/memory/store';
import { recordExtractedContent } from '@/lib/knowledge/auto-linker';

// File Intelligence — dosya okununca: entity çıkarımı → Knowledge Graph →
// Memory → Executive Context akışı. Binary→text çıkarımı istemci-tarafı
// (native/mobil) yapılır; bu servis metni işler. Mevcut entity-extractor
// yeniden kullanılır (yeni extractor YOK).

const MAX_INSIGHTS = 200;

const g = globalThis as unknown as { __apexFileInsights?: FileInsight[] };

function store(): FileInsight[] {
  if (!g.__apexFileInsights) g.__apexFileInsights = [];
  return g.__apexFileInsights;
}

function summarize(text: string, fileType: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const firstMeaningful = clean.slice(0, 180);
  const lineCount = text.split('\n').length;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  return `${fileType.toUpperCase()} · ${wordCount} kelime · ${lineCount} satır · ${firstMeaningful}${clean.length > 180 ? '…' : ''}`;
}

/**
 * Dosya içeriğini işle: tip+dil algıla, entity çıkar, Knowledge Graph'a bağla,
 * Memory'ye kaydet. Sonuç Context Builder v3'e girer.
 */
export function analyzeFile(request: FileInsightRequest): FileInsight {
  const fileType = fileTypeFromName(request.fileName);
  const language = detectLanguage(request.text);
  const contentKind = classifyContent(request.text, { fileName: request.fileName });

  // Mevcut entity extractor
  const rawEntities = extractEntities(request.text);
  const entities = rawEntities
    .filter((e) => e.confidence >= 0.6)
    .slice(0, 25)
    .map((e) => ({ name: e.name, type: e.type, confidence: e.confidence }));

  const insight: FileInsight = {
    id: crypto.randomUUID(),
    fileName: request.fileName,
    fileType,
    language,
    wordCount: request.text.split(/\s+/).filter(Boolean).length,
    entities,
    summary: summarize(request.text, fileType === 'unknown' ? contentKind : fileType),
    createdAt: new Date().toISOString(),
  };

  const st = store();
  st.push(insight);
  if (st.length > MAX_INSIGHTS) st.shift();

  // Knowledge Graph: dosya → çıkarılan entity'ler
  recordExtractedContent({
    sourceType: 'file',
    sourceName: request.fileName,
    contentKind: fileType,
    text: request.text,
  });

  // Memory Engine (mevcut MemoryStore)
  getMemoryStore().addTimelineEntry({
    source: 'desktop',
    title: `Dosya analizi: ${request.fileName}`,
    description: insight.summary,
    timestamp: insight.createdAt,
    metadata: { fileId: insight.id, fileType, entityCount: entities.length },
  });

  return insight;
}

export function getRecentFileInsights(limit = 20): FileInsight[] {
  return store().slice(-limit).reverse();
}

export function getFileInsightCount(): number {
  return store().length;
}
