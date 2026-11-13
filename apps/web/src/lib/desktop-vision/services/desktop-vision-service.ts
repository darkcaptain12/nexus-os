import type {
  DesktopIntelligenceContext,
  OcrRequest,
  OcrResult,
  FileInsightRequest,
  FileInsight,
  ScreenContext,
  ClipboardIngestResult,
  WindowContext,
  VisionHealth,
} from '../types';
import { runOcr, getRecentOcrResults } from '../ocr-service';
import { ingestClipboard, getClipboardHistory } from '../clipboard-service';
import { analyzeFile, getRecentFileInsights } from '../file-insight-service';
import { understandScreen } from '../screen-capture-service';
import { updateWindowContext, getWindowContext, getActiveProject } from '../window-context-service';
import { getVisionHealth, markAnalysis } from '../vision-health';
import { recordExtractedContent } from '@/lib/knowledge/auto-linker';
import { getMemoryStore } from '@/lib/memory/store';

/**
 * Desktop Vision Service — mobil-hazır servis katmanı.
 *
 * Kural: yalnız düz JSON-serileştirilebilir veri döner; UI/framework tipi
 * sızmaz. Web API route'ları, ileride iPhone/Android/iPad/Watch istemcileri ve
 * APEX Voice aynı fonksiyonları çağırır. OCR/Vision ham pixel işlemi istemci
 * native (macOS Vision / mobil ML Kit) veya kayıtlı provider tarafından yapılır.
 */

/** OCR çalıştır + sonucu Knowledge Graph'a bağla (metin varsa). */
export async function processOcr(request: OcrRequest, force = false): Promise<OcrResult | null> {
  const result = await runOcr(request, force);
  if (result && result.text.trim().length > 0) {
    recordExtractedContent({
      sourceType: 'note',
      sourceName: `OCR: ${request.sourceApp ?? result.contentKind}`,
      contentKind: result.contentKind,
      text: result.text,
    });
    getMemoryStore().addTimelineEntry({
      source: 'desktop',
      title: `OCR: ${result.contentKind} (${result.language.language})`,
      description: result.text.slice(0, 200),
      timestamp: result.createdAt,
      metadata: { ocrId: result.id, wordCount: result.wordCount },
    });
    markAnalysis();
  }
  return result;
}

export function processClipboard(content: string, sourceApp?: string): ClipboardIngestResult {
  const result = ingestClipboard(content, sourceApp);
  if (!result.duplicate) markAnalysis();
  return result;
}

export function processFile(request: FileInsightRequest): FileInsight {
  const insight = analyzeFile(request);
  markAnalysis();
  return insight;
}

export function processScreen(input: {
  app: string;
  windowTitle: string;
  ocrText?: string;
  projectHint?: string;
  customerHint?: string;
}): { screen: ScreenContext; window: WindowContext } {
  const screen = understandScreen(input);
  const window = updateWindowContext({ app: input.app, windowTitle: input.windowTitle, screen });
  markAnalysis();
  return { screen, window };
}

export function getDesktopWindowContext(): WindowContext | null {
  return getWindowContext();
}

export function getDesktopActiveProject(): string | null {
  return getActiveProject();
}

export function getDesktopVisionHealth(): VisionHealth {
  return getVisionHealth();
}

/**
 * Context Builder v3 girdisi: pencere + son OCR/clipboard/dosya + aktif proje.
 * Executive bağlamına Desktop Context olarak eklenir.
 */
export function getDesktopIntelligenceContext(): DesktopIntelligenceContext {
  const recentOcr = getRecentOcrResults(5).map((o) => ({
    contentKind: o.contentKind,
    summary: o.text.slice(0, 120),
    wordCount: o.wordCount,
    createdAt: o.createdAt,
  }));
  const recentClipboard = getClipboardHistory(5).map((c) => ({
    kind: c.kind,
    preview: c.content.slice(0, 80),
    createdAt: c.createdAt,
  }));
  const recentFiles = getRecentFileInsights(5).map((f) => ({
    fileName: f.fileName,
    fileType: f.fileType,
    summary: f.summary,
  }));

  return {
    window: getWindowContext(),
    recentOcr,
    recentClipboard,
    recentFiles,
    activeProject: getActiveProject(),
    health: getVisionHealth(),
    generatedAt: new Date().toISOString(),
  };
}
