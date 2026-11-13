// Desktop Intelligence v1.0 — Vision + OCR + Clipboard tipleri (Sprint 16)

export type OcrLanguage = 'tr' | 'en' | 'auto';

// Ekranda/dosyada algılanabilen içerik tipleri
export type ContentKind =
  | 'pdf'
  | 'image'
  | 'screenshot'
  | 'webpage'
  | 'code'
  | 'terminal'
  | 'spreadsheet' // Excel
  | 'document' // Word
  | 'presentation'
  | 'plaintext'
  | 'markdown'
  | 'csv'
  | 'json'
  | 'xml'
  | 'unknown';

export interface DetectedLanguage {
  language: 'tr' | 'en' | 'unknown';
  confidence: number; // 0-1
}

// ─── OCR ─────────────────────────────────────────────────────────────────────

export interface OcrRequest {
  /** İstemci-tarafı native OCR (macOS Vision / ML Kit) çıktısı VEYA ham metin */
  text?: string;
  /** İstemci metni sağlamadıysa provider'a yönlendirilecek görsel referansı */
  imageRef?: string;
  language?: OcrLanguage;
  /** İçerik kaynağı hint'i — sınıflandırmayı güçlendirir */
  sourceApp?: string;
  windowTitle?: string;
}

export interface OcrResult {
  id: string;
  text: string;
  language: DetectedLanguage;
  contentKind: ContentKind;
  wordCount: number;
  lineCount: number;
  /** Metinden çıkarılan yapılandırılmış öğeler */
  extracted: {
    urls: string[];
    filePaths: string[];
    codeSymbols: string[];
    numbers: string[];
  };
  provider: string;
  durationMs: number;
  createdAt: string;
}

export interface OcrProvider {
  name: string;
  /** true → görselden metin çıkarabilir; false → yalnız hazır metin işler */
  supportsImage: boolean;
  extractText(request: OcrRequest): Promise<string>;
}

// ─── Screen Understanding ────────────────────────────────────────────────────

export interface ScreenContext {
  app: string;
  windowTitle: string;
  contentKind: ContentKind;
  ocrText?: string;
  /** Ekrandan çıkarılan ilişki zinciri: app→dosya→proje→görev→müşteri */
  entities: ScreenEntity[];
  summary: string;
  capturedAt: string;
}

export interface ScreenEntity {
  role: 'app' | 'file' | 'layer' | 'project' | 'task' | 'customer' | 'branch' | 'url' | 'error';
  name: string;
  confidence: number;
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

export type ClipboardKind = 'text' | 'code' | 'link' | 'filepath' | 'empty';

export interface ClipboardEntry {
  id: string;
  content: string;
  kind: ClipboardKind;
  hash: string;
  sourceApp?: string;
  language?: string; // kod ise algılanan dil
  createdAt: string;
}

export interface ClipboardIngestResult {
  entry: ClipboardEntry | null;
  duplicate: boolean;
  reason?: string;
}

// ─── File Intelligence ───────────────────────────────────────────────────────

export type SupportedFileType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'txt'
  | 'md'
  | 'csv'
  | 'json'
  | 'xml';

export interface FileInsightRequest {
  fileName: string;
  /** İstemci-tarafı text extraction sonucu (native/mobil) */
  text: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface FileInsight {
  id: string;
  fileName: string;
  fileType: SupportedFileType | 'unknown';
  language: DetectedLanguage;
  wordCount: number;
  entities: { name: string; type: string; confidence: number }[];
  summary: string;
  createdAt: string;
}

// ─── IDE Intelligence ────────────────────────────────────────────────────────

export type KnownIde = 'vscode' | 'cursor' | 'claude-code' | 'terminal' | 'other';

export interface IdeInsight {
  ide: KnownIde;
  ideName: string;
  project?: string;
  activeFile?: string;
  language?: string;
  gitBranch?: string;
  errorCount?: number;
  buildStatus?: 'passing' | 'failing' | 'building' | 'unknown';
  detectedAt: string;
}

// ─── Browser Intelligence ────────────────────────────────────────────────────

export type KnownBrowser = 'chrome' | 'edge' | 'safari' | 'brave' | 'other';

export interface BrowserInsight {
  browser: KnownBrowser;
  browserName: string;
  activeTabTitle?: string;
  domain?: string;
  /** Çalışma bağlamı sınıflandırması */
  workContext: 'development' | 'research' | 'communication' | 'trading' | 'documentation' | 'other';
  detectedAt: string;
}

// ─── Window Context (birleşik) ───────────────────────────────────────────────

export interface WindowContext {
  activeApp: string;
  activeWindowTitle: string;
  ide: IdeInsight | null;
  browser: BrowserInsight | null;
  screen: ScreenContext | null;
  activeProject: string | null;
  updatedAt: string;
}

// ─── Vision Health & Queue ───────────────────────────────────────────────────

export interface VisionHealth {
  ocrProvider: string;
  ocrProvidersAvailable: string[];
  ocrQueueLength: number;
  ocrProcessedTotal: number;
  ocrFailedTotal: number;
  averageOcrMs: number;
  clipboardEntries: number;
  fileInsightsTotal: number;
  lastAnalysisAt: string | null;
  /** OCR yalnız ekran değişiminde/istek üzerine çalışır — sürekli değil */
  triggerMode: 'on-change' | 'on-demand';
  cpuFriendly: boolean;
  generatedAt: string;
}

// ─── Desktop Context (mobil sözleşme — Context Builder v3 girdisi) ────────────

export interface DesktopIntelligenceContext {
  window: WindowContext | null;
  recentOcr: { contentKind: ContentKind; summary: string; wordCount: number; createdAt: string }[];
  recentClipboard: { kind: ClipboardKind; preview: string; createdAt: string }[];
  recentFiles: { fileName: string; fileType: string; summary: string }[];
  activeProject: string | null;
  health: VisionHealth;
  generatedAt: string;
}
