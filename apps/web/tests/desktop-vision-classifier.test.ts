import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  classifyContent,
  fileTypeFromName,
  extractStructured,
} from '../src/lib/desktop-vision/content-classifier';

describe('Content Classifier — dil algılama', () => {
  it('Türkçe metni algılar (stopword + özel karakter)', () => {
    const r = detectLanguage('Bu bir Türkçe cümledir ve içinde çok fazla ünlü harf var');
    expect(r.language).toBe('tr');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('İngilizce metni algılar', () => {
    const r = detectLanguage(
      'This is an English sentence with the common words that appear frequently',
    );
    expect(r.language).toBe('en');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('boş metin unknown döner', () => {
    expect(detectLanguage('').language).toBe('unknown');
  });

  it('Türkçe karakterler güçlü sinyal', () => {
    const r = detectLanguage('Görüşürüz şöyle böyle çünkü işığ');
    expect(r.language).toBe('tr');
  });
});

describe('Content Classifier — içerik tipi', () => {
  it('dosya uzantısından tip: xlsx → spreadsheet', () => {
    expect(classifyContent('', { fileName: 'rapor.xlsx' })).toBe('spreadsheet');
    expect(classifyContent('', { fileName: 'belge.docx' })).toBe('document');
    expect(classifyContent('', { fileName: 'sunum.pptx' })).toBe('presentation');
  });

  it('JSON içeriği algılar', () => {
    expect(classifyContent('{"key": "value", "n": 42}')).toBe('json');
  });

  it('XML içeriği algılar', () => {
    expect(classifyContent('<?xml version="1.0"?><root><item>x</item></root>')).toBe('xml');
  });

  it('kod içeriği algılar (sinyaller)', () => {
    const code = 'function foo() {\n  const x = 1;\n  return x => x + 1;\n}';
    expect(classifyContent(code)).toBe('code');
  });

  it('terminal çıktısı algılar', () => {
    const term = '$ npm run build\nerror: command not found\nexit code 1';
    expect(classifyContent(term)).toBe('terminal');
  });

  it('CSV algılar (tutarlı virgül)', () => {
    const csv = 'ad,soyad,yaş\nali,veli,30\nayşe,fatma,25';
    expect(classifyContent(csv)).toBe('csv');
  });

  it('uygulama ipucundan: Excel app → spreadsheet', () => {
    expect(classifyContent('veri', { app: 'Microsoft Excel' })).toBe('spreadsheet');
    expect(classifyContent('sayfa', { app: 'Terminal' })).toBe('terminal');
  });

  it('markdown algılar', () => {
    expect(classifyContent('# Başlık\n\nBu **kalın** metin')).toBe('markdown');
  });
});

describe('Content Classifier — fileTypeFromName', () => {
  it('desteklenen tipleri eşler', () => {
    expect(fileTypeFromName('a.pdf')).toBe('pdf');
    expect(fileTypeFromName('b.XLSX')).toBe('xlsx');
    expect(fileTypeFromName('c.json')).toBe('json');
    expect(fileTypeFromName('d.exe')).toBe('unknown');
  });
});

describe('Content Classifier — extractStructured', () => {
  it('URL, dosya yolu, sayı çıkarır', () => {
    const text = 'Bak https://github.com/apex ve /Users/emir/proje/dosya.ts satır 42 fiyat 1500';
    const r = extractStructured(text);
    expect(r.urls).toContain('https://github.com/apex');
    expect(r.filePaths.some((p) => p.includes('dosya.ts'))).toBe(true);
    expect(r.numbers).toContain('42');
  });
});
