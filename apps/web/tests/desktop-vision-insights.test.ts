import { describe, it, expect } from 'vitest';
import { analyzeIde } from '../src/lib/desktop-vision/ide-insight';
import { analyzeBrowser } from '../src/lib/desktop-vision/browser-insight';
import { analyzeUi } from '../src/lib/desktop-vision/ui-analysis-service';
import { analyzeFile, getRecentFileInsights } from '../src/lib/desktop-vision/file-insight-service';

describe('IDE Insight', () => {
  it('VS Code algılar + dosya/proje/dil çıkarır', () => {
    const ide = analyzeIde('Code', 'graph-store.ts — apex-os — main');
    expect(ide).not.toBeNull();
    expect(ide!.ide).toBe('vscode');
    expect(ide!.activeFile).toBe('graph-store.ts');
    expect(ide!.language).toBe('TypeScript');
    // Orta parça proje (parts[1]), son parça branch/workspace
    expect(ide!.project).toBe('apex-os');
  });

  it('Cursor algılar', () => {
    const ide = analyzeIde('Cursor', 'app.py — myproject');
    expect(ide!.ide).toBe('cursor');
    expect(ide!.language).toBe('Python');
  });

  it('Terminal algılar', () => {
    const ide = analyzeIde('iTerm2', 'zsh — apex-os');
    expect(ide!.ide).toBe('terminal');
  });

  it('hata sayısı çıkarır → build failing', () => {
    const ide = analyzeIde('Code', 'app.ts — proje — 3 errors');
    expect(ide!.errorCount).toBe(3);
    expect(ide!.buildStatus).toBe('failing');
  });

  it('git branch çıkarır', () => {
    const ide = analyzeIde('Code', 'file.ts — proj (feature-branch)');
    expect(ide!.gitBranch).toBe('feature-branch');
  });

  it('IDE olmayan uygulama null', () => {
    expect(analyzeIde('Spotify', 'Şarkı — Sanatçı')).toBeNull();
  });
});

describe('Browser Insight', () => {
  it('Chrome + domain + development bağlamı', () => {
    const b = analyzeBrowser('Google Chrome', 'apex/os: Pull Request - github.com - Google Chrome');
    expect(b).not.toBeNull();
    expect(b!.browser).toBe('chrome');
    expect(b!.domain).toBe('github.com');
    expect(b!.workContext).toBe('development');
  });

  it('trading bağlamı algılar', () => {
    const b = analyzeBrowser('Safari', 'BTC/USDT - binance.com - Safari');
    expect(b!.workContext).toBe('trading');
  });

  it('Brave algılar', () => {
    const b = analyzeBrowser('Brave Browser', 'Docs - notion.so - Brave');
    expect(b!.browser).toBe('brave');
    expect(b!.workContext).toBe('documentation');
  });

  it('tarayıcı olmayan uygulama null', () => {
    expect(analyzeBrowser('Code', 'file.ts')).toBeNull();
  });
});

describe('UI Analysis', () => {
  it('hata mesajı + buton algılar', () => {
    const ui = analyzeUi({
      app: 'MyApp',
      ocrText: 'Kullanıcı Girişi\nHata: Şifre yanlış\nGiriş Yap\nİptal',
    });
    expect(ui.hasError).toBe(true);
    expect(ui.elements.some((e) => e.kind === 'error')).toBe(true);
    expect(ui.elements.some((e) => e.kind === 'button')).toBe(true);
  });

  it('primary action bulur', () => {
    const ui = analyzeUi({ app: 'Form', ocrText: 'Ad:\nSoyad:\nKaydet\nİptal' });
    expect(ui.primaryAction).toBe('Kaydet');
  });
});

describe('File Insight', () => {
  it('dosya işler + entity çıkarır + KG/Memory yazar', () => {
    const insight = analyzeFile({
      fileName: 'rapor.md',
      text: 'APEX OS projesi React ve TypeScript ile geliştirildi. Emir Yılmaz sorumlu.',
    });
    expect(insight.fileType).toBe('md');
    expect(insight.entities.length).toBeGreaterThan(0);
    expect(insight.summary).toContain('MD');
  });

  it('XLSX içeriği işler', () => {
    const insight = analyzeFile({
      fileName: 'butce.xlsx',
      text: 'Gelir,Gider,Kar\n1000,600,400\n2000,1200,800',
    });
    expect(insight.fileType).toBe('xlsx');
    expect(insight.wordCount).toBeGreaterThan(0);
  });

  it('getRecentFileInsights en yeniyi önce', () => {
    analyzeFile({ fileName: `son-${Date.now()}.txt`, text: 'test içeriği burada' });
    const recent = getRecentFileInsights(1);
    expect(recent.length).toBe(1);
  });
});
