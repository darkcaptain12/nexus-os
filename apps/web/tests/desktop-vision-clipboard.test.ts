import { describe, it, expect } from 'vitest';
import {
  classifyClipboard,
  ingestClipboard,
  getClipboardHistory,
  getClipboardStats,
} from '../src/lib/desktop-vision/clipboard-service';

describe('Clipboard Intelligence', () => {
  it('link algılar', () => {
    expect(classifyClipboard('https://github.com/apex/os')).toBe('link');
  });

  it('dosya yolu algılar', () => {
    expect(classifyClipboard('/Users/emir/Projects/APEX-OS/file.ts')).toBe('filepath');
  });

  it('kod algılar', () => {
    expect(classifyClipboard('const x = () => { return 1; }')).toBe('code');
  });

  it('düz metin algılar', () => {
    expect(classifyClipboard('sadece normal bir cümle bu')).toBe('text');
  });

  it('boş içerik empty', () => {
    expect(classifyClipboard('   ')).toBe('empty');
  });

  it('ingest yeni içerik kaydeder + Memory/KG entegrasyonu', () => {
    const unique = `clipboard-test-${Date.now()}`;
    const result = ingestClipboard(`https://example.com/${unique}`, 'Safari');
    expect(result.duplicate).toBe(false);
    expect(result.entry).not.toBeNull();
    expect(result.entry!.kind).toBe('link');
  });

  it('tekrar eden içerik filtrelenir (dedup)', () => {
    const content = `dedup-test-${Date.now()} tekrar eden metin içeriği`;
    const first = ingestClipboard(content);
    expect(first.duplicate).toBe(false);
    const second = ingestClipboard(content);
    expect(second.duplicate).toBe(true);
    expect(second.entry).toBeNull();
  });

  it('boş içerik reddedilir', () => {
    const result = ingestClipboard('   ');
    expect(result.entry).toBeNull();
    expect(result.reason).toContain('boş');
  });

  it('kod dili algılanır', () => {
    const result = ingestClipboard(`function unique${Date.now()}() { const y = 5; return y; }`);
    expect(result.entry!.kind).toBe('code');
    expect(result.entry!.language).toBeTruthy();
  });

  it('history en yeniyi önce döner', () => {
    ingestClipboard(`history-test-${Date.now()}-son giriş`);
    const history = getClipboardHistory(1);
    expect(history.length).toBe(1);
  });

  it('stats byKind sayar', () => {
    const stats = getClipboardStats();
    expect(typeof stats.total).toBe('number');
    expect(stats.byKind).toHaveProperty('link');
    expect(stats.byKind).toHaveProperty('code');
  });
});
