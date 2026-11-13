import { classifyContent } from './content-classifier';

// UI Analysis Service — OCR metni + pencere bağlamından ekran UI yapısını çözer.
// Butonlar, hata mesajları, form alanları, menüler gibi UI öğelerini sınıflandırır.

export interface UiElement {
  kind: 'button' | 'error' | 'heading' | 'field' | 'menu' | 'status' | 'link';
  text: string;
}

export interface UiAnalysis {
  app: string;
  elements: UiElement[];
  hasError: boolean;
  primaryAction: string | null;
  contentKind: string;
  analyzedAt: string;
}

// Türkçe İ/I case-fold sorunlarını önlemek için sinyaller lowercase karşılaştırılır
// (line önce toLocaleLowerCase('tr') ile normalize edilir).
const ERROR_SIGNALS =
  /\b(error|hata|failed|başarısız|exception|denied|reddedildi|not found|bulunamadı|invalid|geçersiz)\b/;
const BUTTON_SIGNALS =
  /\b(kaydet|save|iptal|cancel|tamam|ok|gönder|submit|sil|delete|onayla|approve|devam|continue|geri|back|kapat|close|giriş|giris|login|yap|ekle|add|ara|search)\b/;
const HEADING_SIGNALS = /^[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ\s]{2,40}$/;

/** OCR satırlarını UI öğelerine sınıflandır — ekranı "anlama". */
export function analyzeUi(input: { app: string; ocrText: string }): UiAnalysis {
  const lines = input.ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length < 100);

  const elements: UiElement[] = [];
  let hasError = false;
  let primaryAction: string | null = null;

  for (const line of lines.slice(0, 60)) {
    const lower = line.toLocaleLowerCase('tr');
    if (ERROR_SIGNALS.test(lower)) {
      elements.push({ kind: 'error', text: line });
      hasError = true;
    } else if (BUTTON_SIGNALS.test(lower) && line.split(/\s+/).length <= 4) {
      elements.push({ kind: 'button', text: line });
      if (
        !primaryAction &&
        /kaydet|save|gönder|submit|onayla|approve|giriş|giris|login/.test(lower)
      ) {
        primaryAction = line;
      }
    } else if (/^https?:\/\//.test(line)) {
      elements.push({ kind: 'link', text: line });
    } else if (HEADING_SIGNALS.test(line) && line.split(/\s+/).length <= 6) {
      elements.push({ kind: 'heading', text: line });
    } else if (/:\s*$|^\w[\w\s]*:/.test(line)) {
      elements.push({ kind: 'field', text: line });
    }
  }

  return {
    app: input.app,
    elements: elements.slice(0, 40),
    hasError,
    primaryAction,
    contentKind: classifyContent(input.ocrText, { app: input.app }),
    analyzedAt: new Date().toISOString(),
  };
}
