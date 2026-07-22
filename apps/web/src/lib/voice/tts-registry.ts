import type { TtsProvider, TtsRequest, TtsResult, VoiceLanguage, VoiceGender } from './types';

// TTS Provider Registry (pluggable). Ses üretimi istemci native (browser
// speechSynthesis, Apple/Android TTS) veya kayıtlı provider'da (ElevenLabs/
// Azure/OpenAI). Bu katman metni + ses yönergelerini üretir; istemci oynatır.

/**
 * Client-synthesis: metni + voiceId döner, istemci speechSynthesis ile seslendirir.
 * Varsayılan — TR/EN, erkek/kadın. Gerçek: metin server'da üretilir, ses istemcide.
 */
const clientSynthesisTts: TtsProvider = {
  name: 'client-synthesis',
  producesAudio: false,
  voices: [
    { id: 'tr-female', language: 'tr', gender: 'female' },
    { id: 'tr-male', language: 'tr', gender: 'male' },
    { id: 'en-female', language: 'en', gender: 'female' },
    { id: 'en-male', language: 'en', gender: 'male' },
  ],
  async synthesize(request: TtsRequest): Promise<{ voiceId: string; audioRef?: string }> {
    const voiceId = `${request.language}-${request.gender}`;
    return { voiceId };
  },
};

const g = globalThis as unknown as {
  __apexTtsProviders?: Map<string, TtsProvider>;
  __apexActiveTts?: string;
};

function providers(): Map<string, TtsProvider> {
  if (!g.__apexTtsProviders) {
    g.__apexTtsProviders = new Map();
    g.__apexTtsProviders.set(clientSynthesisTts.name, clientSynthesisTts);
  }
  return g.__apexTtsProviders;
}

export function registerTtsProvider(provider: TtsProvider, setActive = false): void {
  providers().set(provider.name, provider);
  if (setActive) g.__apexActiveTts = provider.name;
}

export function listTtsProviders(): string[] {
  return [...providers().keys()];
}

export function getActiveTtsProvider(): string {
  return g.__apexActiveTts ?? clientSynthesisTts.name;
}

export function setActiveTtsProvider(name: string): boolean {
  if (!providers().has(name)) return false;
  g.__apexActiveTts = name;
  return true;
}

export async function synthesize(request: TtsRequest): Promise<TtsResult> {
  const start = performance.now();
  const provider = providers().get(getActiveTtsProvider()) ?? clientSynthesisTts;
  const { voiceId, audioRef } = await provider.synthesize(request);
  return {
    text: request.text,
    language: request.language,
    gender: request.gender,
    voiceId,
    provider: provider.name,
    audioRef,
    durationMs: Math.round(performance.now() - start),
  };
}

export const KNOWN_TTS_PROVIDERS = [
  'apple-tts',
  'android-tts',
  'elevenlabs',
  'azure',
  'openai',
] as const;

export function getTtsVoices(): {
  provider: string;
  voices: { id: string; language: VoiceLanguage; gender: VoiceGender }[];
}[] {
  return [...providers().values()].map((p) => ({ provider: p.name, voices: p.voices }));
}
