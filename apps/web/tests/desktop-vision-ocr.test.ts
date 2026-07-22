import { describe, it, expect } from 'vitest';
import {
  runOcr,
  registerOcrProvider,
  listOcrProviders,
  getActiveOcrProvider,
  getOcrStats,
  getRecentOcrResults,
  enqueueOcr,
  drainOcrQueue,
} from '../src/lib/desktop-vision/ocr-service';

describe('OCR Service', () => {
  it('passthrough provider metni işler + dil/tip sınıflandırır', async () => {
    const result = await runOcr(
      { text: 'function test() { return 42; }', sourceApp: 'Code' },
      true,
    );
    expect(result).not.toBeNull();
    expect(result!.contentKind).toBe('code');
    expect(result!.provider).toBe('client-native');
    expect(result!.wordCount).toBeGreaterThan(0);
  });

  it('değişim-tetikli: aynı içerik force=false → atlanır (CPU tasarrufu)', async () => {
    const req = { text: 'aynı ekran içeriği burada', sourceApp: 'TestApp', windowTitle: 'Test' };
    const first = await runOcr(req, true);
    expect(first).not.toBeNull();
    const second = await runOcr(req, false); // aynı hash
    expect(second).toBeNull();
  });

  it('force=true her zaman işler', async () => {
    const req = { text: 'force test içeriği', sourceApp: 'X' };
    await runOcr(req, true);
    const forced = await runOcr(req, true);
    expect(forced).not.toBeNull();
  });

  it('Türkçe metin dili tr algılanır', async () => {
    const result = await runOcr(
      { text: 'Bu belge çok önemli bir rapor içeriyor ve şirket için değerlidir' },
      true,
    );
    expect(result!.language.language).toBe('tr');
  });

  it('yapılandırılmış öğe çıkarır', async () => {
    const result = await runOcr(
      { text: 'Link: https://apex.os dosya /home/x/a.ts', windowTitle: 'unique-struct-test' },
      true,
    );
    expect(result!.extracted.urls.length).toBeGreaterThan(0);
  });

  it('pluggable provider kaydı çalışır', () => {
    registerOcrProvider({
      name: 'test-tesseract',
      supportsImage: true,
      async extractText() {
        return 'mock görsel metni';
      },
    });
    expect(listOcrProviders()).toContain('test-tesseract');
  });

  it('kayıtlı provider aktif edilebilir', async () => {
    registerOcrProvider(
      {
        name: 'active-test',
        supportsImage: true,
        async extractText() {
          return 'aktif provider çıktısı buradadır';
        },
      },
      true,
    );
    expect(getActiveOcrProvider()).toBe('active-test');
    const result = await runOcr({ imageRef: 'screenshot.png', windowTitle: 'prov-test' }, true);
    expect(result!.text).toContain('aktif provider');
    // varsayılana geri dön
    registerOcrProvider(
      {
        name: 'client-native',
        supportsImage: false,
        async extractText(r) {
          if (r.text === undefined) throw new Error('metin bekler');
          return r.text;
        },
      },
      true,
    );
  });

  it('kuyruk enqueue + drain', async () => {
    const before = getOcrStats().processedTotal;
    enqueueOcr({ text: 'kuyruk item bir farklı içerik', windowTitle: 'q1' });
    enqueueOcr({ text: 'kuyruk item iki farklı içerik', windowTitle: 'q2' });
    const drained = await drainOcrQueue();
    expect(drained.length).toBeGreaterThanOrEqual(1);
    expect(getOcrStats().processedTotal).toBeGreaterThan(before);
  });

  it('getRecentOcrResults en yeniyi önce döner', async () => {
    await runOcr({ text: 'recent test unique 12345', windowTitle: 'recent-unique' }, true);
    const recent = getRecentOcrResults(1);
    expect(recent.length).toBe(1);
  });

  it('stats yapısı doğru', () => {
    const s = getOcrStats();
    expect(typeof s.processedTotal).toBe('number');
    expect(s.providersAvailable).toContain('client-native');
  });
});
