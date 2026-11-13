import { describe, it, expect } from 'vitest';
import {
  transcribe,
  registerSttProvider,
  listSttProviders,
  getActiveSttProvider,
  setActiveSttProvider,
} from '../src/lib/voice/stt-registry';
import {
  synthesize,
  registerTtsProvider,
  listTtsProviders,
  getActiveTtsProvider,
  getTtsVoices,
} from '../src/lib/voice/tts-registry';

describe('STT Registry', () => {
  it('client-native passthrough transkripti işler', async () => {
    const r = await transcribe({ transcript: '  merhaba dünya  ', language: 'tr' });
    expect(r.text).toBe('merhaba dünya');
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.provider).toBe('client-native');
  });

  it('varsayılan provider client-native', () => {
    expect(listSttProviders()).toContain('client-native');
    expect(getActiveSttProvider()).toBe('client-native');
  });

  it('pluggable STT provider kaydı + aktifleştirme', async () => {
    registerSttProvider({
      name: 'whisper-test',
      supportsAudio: true,
      languages: ['tr', 'en'],
      async transcribe() {
        return { text: 'whisper çıktısı', confidence: 0.99 };
      },
    });
    expect(listSttProviders()).toContain('whisper-test');
    expect(setActiveSttProvider('whisper-test')).toBe(true);
    const r = await transcribe({ audioRef: 'a.wav', language: 'tr' });
    expect(r.text).toBe('whisper çıktısı');
    setActiveSttProvider('client-native'); // geri al
  });

  it('bilinmeyen provider aktifleştirilemez', () => {
    expect(setActiveSttProvider('yok-boyle')).toBe(false);
  });
});

describe('TTS Registry', () => {
  it('client-synthesis TR/EN erkek/kadın ses döner', async () => {
    const r = await synthesize({ text: 'merhaba', language: 'tr', gender: 'female' });
    expect(r.voiceId).toBe('tr-female');
    expect(r.provider).toBe('client-synthesis');
    expect(r.text).toBe('merhaba');
  });

  it('erkek İngilizce ses', async () => {
    const r = await synthesize({ text: 'hello', language: 'en', gender: 'male' });
    expect(r.voiceId).toBe('en-male');
  });

  it('4 ses varyantı mevcut', () => {
    const voices = getTtsVoices();
    const clientVoices = voices.find((v) => v.provider === 'client-synthesis');
    expect(clientVoices?.voices.length).toBe(4);
  });

  it('pluggable TTS provider (ElevenLabs slot)', async () => {
    registerTtsProvider(
      {
        name: 'elevenlabs-test',
        producesAudio: true,
        voices: [{ id: 'el-tr-female', language: 'tr', gender: 'female' }],
        async synthesize() {
          return { voiceId: 'el-tr-female', audioRef: 'audio://xyz' };
        },
      },
      true,
    );
    const r = await synthesize({ text: 'test', language: 'tr', gender: 'female' });
    expect(r.audioRef).toBe('audio://xyz');
    // geri al
    const { setActiveTtsProvider } = await import('../src/lib/voice/tts-registry');
    setActiveTtsProvider('client-synthesis');
  });

  it('varsayılan aktif provider', () => {
    expect(listTtsProviders()).toContain('client-synthesis');
    expect(getActiveTtsProvider()).toBeTruthy();
  });
});
