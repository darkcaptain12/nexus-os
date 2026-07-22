import type { SttProvider, SttRequest, SttResult, VoiceLanguage } from './types';

// STT Provider Registry (exchange/OCR registry pattern). Ham audio→text istemci
// native (browser SpeechRecognition, Whisper, Apple/Android Speech) veya kayıtlı
// provider'da yapılır. Bu katman transkripti normalize eder + güven skoru döner.

/**
 * Passthrough: istemci zaten transkripti üretmiş (native STT). Varsayılan.
 * Gerçek işleme — mock değil; ham audio istemci tarafında çözülür.
 */
const clientNativeStt: SttProvider = {
  name: 'client-native',
  supportsAudio: false,
  languages: ['tr', 'en'],
  async transcribe(request: SttRequest): Promise<{ text: string; confidence: number }> {
    if (request.transcript !== undefined) {
      return { text: request.transcript.trim(), confidence: 0.95 };
    }
    throw new Error(
      'client-native STT transkript bekler (native SpeechRecognition çıktısı). Audio için audio-capable provider kaydedin.',
    );
  },
};

const g = globalThis as unknown as {
  __apexSttProviders?: Map<string, SttProvider>;
  __apexActiveStt?: string;
};

function providers(): Map<string, SttProvider> {
  if (!g.__apexSttProviders) {
    g.__apexSttProviders = new Map();
    g.__apexSttProviders.set(clientNativeStt.name, clientNativeStt);
  }
  return g.__apexSttProviders;
}

export function registerSttProvider(provider: SttProvider, setActive = false): void {
  providers().set(provider.name, provider);
  if (setActive) g.__apexActiveStt = provider.name;
}

export function listSttProviders(): string[] {
  return [...providers().keys()];
}

export function getActiveSttProvider(): string {
  return g.__apexActiveStt ?? clientNativeStt.name;
}

export function setActiveSttProvider(name: string): boolean {
  if (!providers().has(name)) return false;
  g.__apexActiveStt = name;
  return true;
}

export async function transcribe(request: SttRequest): Promise<SttResult> {
  const start = performance.now();
  const provider = providers().get(getActiveSttProvider()) ?? clientNativeStt;
  const { text, confidence } = await provider.transcribe(request);
  return {
    text,
    language: request.language,
    confidence,
    provider: provider.name,
    durationMs: Math.round(performance.now() - start),
  };
}

// Sprint spec'teki 6 provider'ın kayıt slotları — istemci native implementasyonu
// bağlandığında setActive edilir. İsimler registry'de görünür (mobil seçim UI'ı).
export const KNOWN_STT_PROVIDERS = [
  'whisper',
  'apple-speech',
  'android-speech',
  'deepgram',
  'azure',
  'google',
] as const;

export function getSttCapabilities(): {
  name: string;
  languages: VoiceLanguage[];
  supportsAudio: boolean;
}[] {
  return [...providers().values()].map((p) => ({
    name: p.name,
    languages: p.languages,
    supportsAudio: p.supportsAudio,
  }));
}
