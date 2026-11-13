import { getWindowContext } from '../window-context-service';
import { getRecentOcrResults } from '../ocr-service';
import { getRecentFileInsights } from '../file-insight-service';
import { analyzeUi } from '../ui-analysis-service';
import type { WindowContext } from '../types';

// Voice Bridge — Voice Service'in Desktop Intelligence'a düz JSON erişimi.
// Voice "ekranda ne görüyorsun / bu PDF'yi özetle / bu hata neden / Excel analiz"
// intent'lerini besler. Yeni servis değil — mevcut vision servislerini sarar.

export function getDesktopWindowContext(): WindowContext | null {
  return getWindowContext();
}

/** "Ekranda ne görüyorsun?" — aktif pencere + son OCR'dan konuşulabilir özet. */
export function describeScreen(): { speech: string; data: Record<string, unknown> } {
  const window = getWindowContext();
  const recentOcr = getRecentOcrResults(1)[0];

  if (!window && !recentOcr) {
    return {
      speech: 'Şu an ekran bağlamı yok. Desktop Agent ekran verisi göndermeli.',
      data: { window: null },
    };
  }

  const parts: string[] = [];
  if (window) {
    parts.push(`Aktif uygulama ${window.activeApp}`);
    if (window.ide) {
      parts.push(
        `${window.ide.ideName}'de${window.ide.project ? ` ${window.ide.project} projesi` : ''}${window.ide.activeFile ? `, ${window.ide.activeFile} dosyası açık` : ''}${window.ide.language ? ` (${window.ide.language})` : ''}${window.ide.gitBranch ? `, branch: ${window.ide.gitBranch}` : ''}${window.ide.errorCount ? `, ${window.ide.errorCount} hata var` : ''}`,
      );
    }
    if (window.browser?.domain) {
      parts.push(
        `${window.browser.browserName}'de ${window.browser.domain} açık (${window.browser.workContext})`,
      );
    }
    if (window.screen && window.screen.entities.length > 1) {
      const chain = window.screen.entities.map((e) => e.name).join(' → ');
      parts.push(`Ekran zinciri: ${chain}`);
    }
  }
  if (recentOcr) {
    parts.push(`Son OCR: ${recentOcr.contentKind}, ${recentOcr.wordCount} kelime`);
  }

  return {
    speech: parts.join('. ') || 'Ekranda belirgin bir içerik algılanmadı.',
    data: { window, ocrContentKind: recentOcr?.contentKind ?? null },
  };
}

/** "Bu hata neden oluyor?" — aktif OCR/UI'dan hata mesajını bul, açıkla. */
export function explainScreenError(): { speech: string; data: Record<string, unknown> } {
  const window = getWindowContext();
  const recentOcr = getRecentOcrResults(3);

  // IDE hata sayısı
  if (window?.ide?.errorCount && window.ide.errorCount > 0) {
    return {
      speech: `${window.ide.ideName}'de ${window.ide.errorCount} hata var${window.ide.activeFile ? `, ${window.ide.activeFile} dosyasında` : ''}. Build durumu: ${window.ide.buildStatus}.`,
      data: {
        errorCount: window.ide.errorCount,
        file: window.ide.activeFile,
        buildStatus: window.ide.buildStatus,
      },
    };
  }

  // OCR metninde hata mesajı ara
  for (const ocr of recentOcr) {
    const ui = analyzeUi({ app: window?.activeApp ?? 'bilinmeyen', ocrText: ocr.text });
    const errorEl = ui.elements.find((e) => e.kind === 'error');
    if (errorEl) {
      return {
        speech: `Ekranda hata algılandı: "${errorEl.text}". Bu genellikle ${inferErrorCause(errorEl.text)} anlamına gelir.`,
        data: { errorText: errorEl.text, contentKind: ocr.contentKind },
      };
    }
  }

  return {
    speech:
      'Ekranda belirgin bir hata mesajı algılamadım. Hatanın olduğu pencereyi aktif edip tekrar deneyin.',
    data: { found: false },
  };
}

function inferErrorCause(errorText: string): string {
  const t = errorText.toLowerCase();
  if (/not found|bulunamadı|404/.test(t)) return 'aranan kaynağın mevcut olmaması';
  if (/permission|denied|reddedildi|403|401/.test(t)) return 'yetki/izin eksikliği';
  if (/timeout|zaman aşımı/.test(t)) return 'ağ/işlem zaman aşımı';
  if (/undefined|null|cannot read/.test(t)) return 'tanımsız değişkene erişim (kod hatası)';
  if (/syntax|parse|unexpected/.test(t)) return 'sözdizimi hatası';
  if (/connection|bağlantı|refused/.test(t)) return 'bağlantı sorunu';
  return 'bir çalışma zamanı sorunu';
}

/** "Bu PDF'yi özetle / Excel analiz et" — isimle veya en son analiz edilen dosya. */
export function getRecentFileInsightsForVoice(fileName?: string): {
  speech: string;
  data: Record<string, unknown>;
} {
  const insights = getRecentFileInsights(10);
  if (insights.length === 0) {
    return {
      speech: 'Henüz analiz edilmiş dosya yok. Önce Desktop Agent dosya içeriği göndermeli.',
      data: { found: false },
    };
  }

  const target = fileName
    ? (insights.find((f) => f.fileName.toLowerCase().includes(fileName.toLowerCase())) ??
      insights[0]!)
    : insights[0]!;

  const entityStr = target.entities
    .slice(0, 5)
    .map((e) => e.name)
    .join(', ');
  return {
    speech: `${target.fileName} (${target.fileType}, ${target.wordCount} kelime). ${target.summary}${entityStr ? `. Öne çıkan öğeler: ${entityStr}` : ''}`,
    data: {
      fileName: target.fileName,
      fileType: target.fileType,
      summary: target.summary,
      entities: target.entities,
    },
  };
}

export function getRecentOcrForVoice(): { contentKind: string; text: string } | null {
  const ocr = getRecentOcrResults(1)[0];
  return ocr ? { contentKind: ocr.contentKind, text: ocr.text } : null;
}
