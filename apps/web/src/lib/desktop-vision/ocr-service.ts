import type { OcrRequest, OcrResult, OcrProvider, OcrLanguage } from './types';
import { detectLanguage, classifyContent, extractStructured } from './content-classifier';

// OCR Service — pluggable provider (exchange-registry pattern). Ham pixel→text
// istemci-tarafı native OCR (macOS Vision / mobil ML Kit) veya kayıtlı provider
// tarafından yapılır; bu servis metni normalize eder, dil+içerik sınıflandırır,
// yapılandırılmış öğe çıkarır, Knowledge Graph'a beslenmek üzere döner.
//
// Performans: OCR SÜREKLİ çalışmaz. Kuyruk yalnız ekran değişince (hash farkı)
// veya kullanıcı isteyince işlenir. CPU dostu.

/**
 * Passthrough provider: istemci zaten metni çıkarmış (native OCR). Varsayılan.
 * Gerçek işleme downstream'de (dil/sınıf/entity) — mock değil.
 */
const passthroughProvider: OcrProvider = {
  name: 'client-native',
  supportsImage: false,
  async extractText(request: OcrRequest): Promise<string> {
    if (request.text !== undefined) return request.text;
    throw new Error(
      'client-native provider metin bekler (istemci native OCR çıktısı). Görsel için image-capable provider kaydedin.',
    );
  },
};

const g = globalThis as unknown as {
  __apexOcrProviders?: Map<string, OcrProvider>;
  __apexOcrState?: OcrEngineState;
};

interface OcrEngineState {
  queue: OcrRequest[];
  results: OcrResult[];
  processedTotal: number;
  failedTotal: number;
  durationsMs: number[];
  lastScreenHash: string | null;
  activeProvider: string;
}

function providers(): Map<string, OcrProvider> {
  if (!g.__apexOcrProviders) {
    g.__apexOcrProviders = new Map();
    g.__apexOcrProviders.set(passthroughProvider.name, passthroughProvider);
  }
  return g.__apexOcrProviders;
}

function state(): OcrEngineState {
  if (!g.__apexOcrState) {
    g.__apexOcrState = {
      queue: [],
      results: [],
      processedTotal: 0,
      failedTotal: 0,
      durationsMs: [],
      lastScreenHash: null,
      activeProvider: passthroughProvider.name,
    };
  }
  return g.__apexOcrState;
}

export function registerOcrProvider(provider: OcrProvider, setActive = false): void {
  providers().set(provider.name, provider);
  if (setActive) state().activeProvider = provider.name;
}

export function listOcrProviders(): string[] {
  return [...providers().keys()];
}

export function getActiveOcrProvider(): string {
  return state().activeProvider;
}

// Basit deterministik hash — ekran değişimi tespiti (kriptografik değil)
function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${h}`;
}

const MAX_RESULTS = 200;
const MAX_DURATIONS = 100;

/**
 * Değişim-tetikli: aynı ekran içeriği tekrar geldiğinde OCR ATLANIR (CPU tasarrufu).
 * Yalnız hash farklıysa işlenir. Kullanıcı isteği (force) her zaman işler.
 */
export async function runOcr(request: OcrRequest, force = false): Promise<OcrResult | null> {
  const st = state();
  const previewText = request.text ?? request.imageRef ?? '';
  const hash = hashText(`${request.sourceApp ?? ''}|${request.windowTitle ?? ''}|${previewText}`);

  if (!force && hash === st.lastScreenHash) {
    return null; // ekran değişmedi — OCR atlandı
  }
  st.lastScreenHash = hash;

  const start = performance.now();
  const provider = providers().get(st.activeProvider) ?? passthroughProvider;

  try {
    const text = await provider.extractText(request);
    const language = detectLanguage(text);
    const contentKind = classifyContent(text, {
      app: request.sourceApp,
      windowTitle: request.windowTitle,
    });
    const lines = text.split('\n');
    const durationMs = Math.round(performance.now() - start);

    const result: OcrResult = {
      id: crypto.randomUUID(),
      text,
      language,
      contentKind,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      lineCount: lines.length,
      extracted: extractStructured(text),
      provider: provider.name,
      durationMs,
      createdAt: new Date().toISOString(),
    };

    st.results.push(result);
    if (st.results.length > MAX_RESULTS) st.results.shift();
    st.processedTotal++;
    st.durationsMs.push(durationMs);
    if (st.durationsMs.length > MAX_DURATIONS) st.durationsMs.shift();

    return result;
  } catch (err) {
    st.failedTotal++;
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export function enqueueOcr(request: OcrRequest): number {
  const st = state();
  st.queue.push(request);
  return st.queue.length;
}

/** Kuyruğu boşalt — yalnız çağrıldığında (sürekli poll YOK). */
export async function drainOcrQueue(language: OcrLanguage = 'auto'): Promise<OcrResult[]> {
  const st = state();
  const out: OcrResult[] = [];
  const pending = st.queue.splice(0, st.queue.length);
  for (const req of pending) {
    const result = await runOcr({ ...req, language: req.language ?? language }, true).catch(
      () => null,
    );
    if (result) out.push(result);
  }
  return out;
}

export function getRecentOcrResults(limit = 20): OcrResult[] {
  return state().results.slice(-limit).reverse();
}

export function getOcrStats(): {
  queueLength: number;
  processedTotal: number;
  failedTotal: number;
  averageMs: number;
  activeProvider: string;
  providersAvailable: string[];
} {
  const st = state();
  const avg = st.durationsMs.length
    ? Math.round(st.durationsMs.reduce((s, v) => s + v, 0) / st.durationsMs.length)
    : 0;
  return {
    queueLength: st.queue.length,
    processedTotal: st.processedTotal,
    failedTotal: st.failedTotal,
    averageMs: avg,
    activeProvider: st.activeProvider,
    providersAvailable: [...providers().keys()],
  };
}
