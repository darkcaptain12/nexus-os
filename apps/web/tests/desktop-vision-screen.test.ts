import { describe, it, expect } from 'vitest';
import { understandScreen } from '../src/lib/desktop-vision/screen-capture-service';
import {
  updateWindowContext,
  getWindowContext,
  getActiveProject,
} from '../src/lib/desktop-vision/window-context-service';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';

describe('Screen Understanding', () => {
  it('IDE ekranından app→dosya→proje zinciri çıkarır + KG yazar', () => {
    const screen = understandScreen({
      app: 'Code',
      windowTitle: 'server.ts — apex-backend — main',
    });
    expect(screen.entities.some((e) => e.role === 'app')).toBe(true);
    expect(screen.entities.some((e) => e.role === 'file' && e.name === 'server.ts')).toBe(true);
    expect(screen.entities.some((e) => e.role === 'project')).toBe(true);

    // Knowledge Graph'a yazıldı
    const graph = getKnowledgeGraph();
    expect(graph.findNode('file', 'server.ts')).not.toBeNull();
  });

  it('Photoshop ekranından dosya→katman çıkarır (tasarım)', () => {
    const screen = understandScreen({
      app: 'Adobe Photoshop',
      windowTitle: 'banner.psd @ 100% (Arka Plan, RGB/8)',
      customerHint: 'ACME Şirketi',
    });
    expect(screen.entities.some((e) => e.role === 'file' && e.name.includes('banner.psd'))).toBe(
      true,
    );
    expect(screen.entities.some((e) => e.role === 'customer' && e.name === 'ACME Şirketi')).toBe(
      true,
    );
  });

  it('browser ekranından url çıkarır', () => {
    const screen = understandScreen({
      app: 'Google Chrome',
      windowTitle: 'APEX Docs - docs.apex.os - Google Chrome',
    });
    expect(screen.entities.some((e) => e.role === 'url')).toBe(true);
  });

  it('OCR metninden URL entity ekler', () => {
    const screen = understandScreen({
      app: 'Preview',
      windowTitle: 'belge.pdf',
      ocrText: 'Daha fazla bilgi: https://apex-os.dev/docs adresinde',
    });
    expect(screen.contentKind).toBe('pdf');
    expect(screen.entities.some((e) => e.role === 'url')).toBe(true);
  });

  it('summary ilişki zincirini içerir', () => {
    const screen = understandScreen({ app: 'Code', windowTitle: 'a.ts — proj' });
    expect(screen.summary).toContain('→');
  });
});

describe('Window Context Service', () => {
  it('IDE + screen birleşiminden aktif proje çıkarır', () => {
    const context = updateWindowContext({
      app: 'Cursor',
      windowTitle: 'main.rs — rust-project',
    });
    expect(context.ide).not.toBeNull();
    expect(context.activeProject).toBe('rust-project');
    expect(getActiveProject()).toBe('rust-project');
  });

  it('getWindowContext son durumu döner', () => {
    updateWindowContext({ app: 'Safari', windowTitle: 'Test - example.com - Safari' });
    const ctx = getWindowContext();
    expect(ctx!.activeApp).toBe('Safari');
    expect(ctx!.browser).not.toBeNull();
  });
});
