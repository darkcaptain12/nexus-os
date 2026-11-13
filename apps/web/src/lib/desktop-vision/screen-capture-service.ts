import type { ScreenContext, ScreenEntity, ContentKind } from './types';
import { classifyContent, extractStructured } from './content-classifier';
import { analyzeIde } from './ide-insight';
import { analyzeBrowser } from './browser-insight';
import { recordScreenContext } from '@/lib/knowledge/auto-linker';
import { getMemoryStore } from '@/lib/memory/store';

// Screen Understanding — ekrana bakıp anlama. Ham pixel yakalama istemci-tarafı
// (native screencapture); bu servis app + pencere başlığı + OCR metninden
// ilişki zinciri çıkarır: app→dosya→katman→proje→görev→müşteri.

// Tasarım uygulamaları için katman/dosya çıkarımı (Photoshop örneği)
const DESIGN_APPS = /photoshop|illustrator|figma|sketch|affinity|xd|indesign/i;

function extractDesignEntities(title: string): ScreenEntity[] {
  const entities: ScreenEntity[] = [];
  // Photoshop başlık: "dosya.psd @ 100% (Katman 1, RGB/8)"
  const fileMatch = title.match(/([\w\s-]+\.(?:psd|ai|fig|sketch|afdesign|xd|indd|png|jpg))/i);
  if (fileMatch) {
    entities.push({ role: 'file', name: fileMatch[1]!.trim(), confidence: 0.9 });
  }
  const layerMatch = title.match(/\(([^,)]+)(?:,|\))/);
  if (layerMatch && !layerMatch[1]!.includes('%')) {
    entities.push({ role: 'layer', name: layerMatch[1]!.trim(), confidence: 0.7 });
  }
  return entities;
}

/**
 * Ekran bağlamını çöz. app/title zorunlu, ocrText opsiyonel.
 * IDE/browser/design için özel entity çıkarımı; sonuç Knowledge Graph'a yazılır.
 */
export function understandScreen(input: {
  app: string;
  windowTitle: string;
  ocrText?: string;
  projectHint?: string;
  customerHint?: string;
}): ScreenContext {
  const { app, windowTitle, ocrText } = input;
  const contentKind: ContentKind = classifyContent(ocrText ?? windowTitle, { app, windowTitle });
  const entities: ScreenEntity[] = [{ role: 'app', name: app, confidence: 1 }];

  // IDE bağlamı
  const ide = analyzeIde(app, windowTitle);
  if (ide) {
    if (ide.activeFile) entities.push({ role: 'file', name: ide.activeFile, confidence: 0.85 });
    if (ide.project) entities.push({ role: 'project', name: ide.project, confidence: 0.8 });
    if (ide.gitBranch) entities.push({ role: 'branch', name: ide.gitBranch, confidence: 0.75 });
    if (ide.errorCount && ide.errorCount > 0) {
      entities.push({ role: 'error', name: `${ide.errorCount} hata`, confidence: 0.7 });
    }
  }

  // Browser bağlamı
  const browser = analyzeBrowser(app, windowTitle);
  if (browser?.domain) {
    entities.push({ role: 'url', name: browser.domain, confidence: 0.8 });
  }

  // Tasarım uygulaması bağlamı (Photoshop→dosya→katman)
  if (DESIGN_APPS.test(app)) {
    entities.push(...extractDesignEntities(windowTitle));
  }

  // Hint'ler
  if (input.projectHint)
    entities.push({ role: 'project', name: input.projectHint, confidence: 0.9 });
  if (input.customerHint)
    entities.push({ role: 'customer', name: input.customerHint, confidence: 0.85 });

  // OCR metninden URL/dosya yolu
  if (ocrText) {
    const structured = extractStructured(ocrText);
    for (const url of structured.urls.slice(0, 3)) {
      try {
        entities.push({ role: 'url', name: new URL(url).hostname, confidence: 0.6 });
      } catch {
        // geçersiz
      }
    }
  }

  const roleSummary = entities.map((e) => `${e.role}:${e.name}`).join(' → ');
  const summary = `${app} (${contentKind}) — ${roleSummary}`;

  const context: ScreenContext = {
    app,
    windowTitle,
    contentKind,
    ocrText: ocrText?.slice(0, 2000),
    entities,
    summary,
    capturedAt: new Date().toISOString(),
  };

  // Knowledge Graph zinciri
  recordScreenContext({
    app,
    entities: entities.filter((e) => e.role !== 'app').map((e) => ({ role: e.role, name: e.name })),
    summary,
  });

  // Memory
  getMemoryStore().addTimelineEntry({
    source: 'desktop',
    title: `Ekran: ${app}`,
    description: summary,
    timestamp: context.capturedAt,
    metadata: { contentKind, entityCount: entities.length },
  });

  return context;
}
