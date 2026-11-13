import { describe, it, expect } from 'vitest';
import {
  processOcr,
  processFile,
  processScreen,
  getDesktopIntelligenceContext,
  getDesktopVisionHealth,
} from '../src/lib/desktop-vision/services/desktop-vision-service';
import { parseVoiceIntent, handleVoiceIntent } from '../src/lib/quant/services/voice-service';
import { getMemoryStore } from '../src/lib/memory/store';

describe('Desktop Vision Service — mobil katman', () => {
  it('processOcr sonucu KG + Memory yazar', async () => {
    const before = getMemoryStore().getTimeline(undefined, 'desktop', 1000).length;
    const result = await processOcr(
      {
        text: 'Ekran metni: proje toplantısı notları burada',
        sourceApp: 'Notes',
        windowTitle: `ocr-int-${Date.now()}`,
      },
      true,
    );
    expect(result).not.toBeNull();
    const after = getMemoryStore().getTimeline(undefined, 'desktop', 1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it('processFile → insight + Memory', async () => {
    const insight = processFile({
      fileName: `analiz-${Date.now()}.csv`,
      text: 'ürün,fiyat\nkalem,10\ndefter,20',
    });
    expect(insight.fileType).toBe('csv');
  });

  it('processScreen → screen + window context', () => {
    const { screen, window } = processScreen({
      app: 'Code',
      windowTitle: 'index.ts — my-app — develop',
    });
    expect(screen.entities.length).toBeGreaterThan(1);
    expect(window.activeProject).toBe('my-app');
  });

  it('getDesktopIntelligenceContext düz JSON döner (Context Builder v3)', () => {
    const ctx = getDesktopIntelligenceContext();
    expect(ctx).toHaveProperty('window');
    expect(ctx).toHaveProperty('recentOcr');
    expect(ctx).toHaveProperty('recentClipboard');
    expect(ctx).toHaveProperty('recentFiles');
    expect(ctx).toHaveProperty('health');
    expect(Array.isArray(ctx.recentOcr)).toBe(true);
  });

  it('vision health triggerMode on-change (CPU dostu)', () => {
    const health = getDesktopVisionHealth();
    expect(health.triggerMode).toBe('on-change');
    expect(health.cpuFriendly).toBe(true);
    expect(health.ocrProvidersAvailable).toContain('client-native');
  });
});

describe('Voice — Desktop Intelligence intent’leri', () => {
  it('"ekranda ne görüyorsun" → screen.describe', () => {
    const intent = parseVoiceIntent('Hey APEX, ekranda ne görüyorsun?');
    expect(intent.intent).toBe('screen.describe');
  });

  it('"bu PDF\'yi özetle" → file.summarize', () => {
    const intent = parseVoiceIntent("Bu PDF'yi özetle");
    expect(intent.intent).toBe('file.summarize');
  });

  it('"bu hata neden oluyor" → error.explain', () => {
    const intent = parseVoiceIntent('Bu hata neden oluyor?');
    expect(intent.intent).toBe('error.explain');
  });

  it('"bu Excel dosyasını analiz et" → file.analyze', () => {
    const intent = parseVoiceIntent('Bu Excel dosyasını analiz et');
    expect(intent.intent).toBe('file.analyze');
  });

  it('screen.describe ekran bağlamından konuşma üretir', async () => {
    // Önce ekran bağlamı kur
    processScreen({ app: 'Cursor', windowTitle: 'voice-test.ts — voice-proj — main' });
    const response = await handleVoiceIntent({
      intent: 'screen.describe',
      confidence: 0.9,
      params: {},
      rawText: 'ekranda ne görüyorsun',
    });
    expect(response.intent).toBe('screen.describe');
    expect(response.speech.length).toBeGreaterThan(10);
    expect(response.speech).toContain('Cursor');
  });

  it('error.explain IDE hatasını açıklar', async () => {
    processScreen({ app: 'Code', windowTitle: 'broken.ts — app — 5 errors' });
    const response = await handleVoiceIntent({
      intent: 'error.explain',
      confidence: 0.9,
      params: {},
      rawText: 'bu hata neden',
    });
    expect(response.speech).toContain('hata');
  });

  it('file.summarize son dosyayı özetler', async () => {
    processFile({
      fileName: 'ozet-test.pdf',
      text: 'Bu PDF önemli finansal veriler içerir. Toplam gelir 50000 TL.',
    });
    const response = await handleVoiceIntent({
      intent: 'file.summarize',
      confidence: 0.9,
      params: { fileName: 'ozet-test.pdf' },
      rawText: 'bu pdfi özetle',
    });
    expect(response.data).not.toBeNull();
    expect(response.speech).toContain('ozet-test.pdf');
  });
});
