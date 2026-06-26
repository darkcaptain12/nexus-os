import { describe, it, expect } from 'vitest';
import { getSystemInfo } from '../src/collectors/system-collector';
import { detectIDE } from '../src/collectors/ide-collector';
import { detectBrowser } from '../src/collectors/browser-collector';

describe('SystemCollector', () => {
  it('returns system info', () => {
    const info = getSystemInfo();
    expect(info.platform).toBeDefined();
    expect(info.hostname).toBeDefined();
    expect(info.cpu.cores).toBeGreaterThan(0);
    expect(info.memory.total).toBeGreaterThan(0);
    expect(info.memory.percentage).toBeGreaterThan(0);
    expect(info.memory.percentage).toBeLessThanOrEqual(100);
    expect(info.timezone).toBeDefined();
    expect(info.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('IDECollector', () => {
  it('returns null for non-IDE window', () => {
    expect(detectIDE({ app: 'Chrome', title: 'Google', pid: 1 })).toBeNull();
  });

  it('returns null for null window', () => {
    expect(detectIDE(null)).toBeNull();
  });

  it('detects VS Code', () => {
    const result = detectIDE({
      app: 'Code',
      title: 'main.ts — APEX-OS — Visual Studio Code',
      pid: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.ide).toBe('Code');
    expect(result!.workspace).toContain('APEX-OS');
  });

  it('detects Cursor', () => {
    const result = detectIDE({
      app: 'Cursor',
      title: 'index.ts — my-project',
      pid: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.ide).toBe('Cursor');
  });

  it('detects other IDEs', () => {
    expect(detectIDE({ app: 'WebStorm', title: 'test', pid: 1 })?.ide).toBe('WebStorm');
    expect(detectIDE({ app: 'Xcode', title: 'test', pid: 1 })?.ide).toBe('Xcode');
  });
});

describe('BrowserCollector', () => {
  it('returns null for non-browser window', () => {
    expect(detectBrowser({ app: 'Code', title: 'file.ts', pid: 1 })).toBeNull();
  });

  it('returns null for null window', () => {
    expect(detectBrowser(null)).toBeNull();
  });

  it('detects Chrome', () => {
    const result = detectBrowser({
      app: 'Google Chrome',
      title: 'GitHub - Google Chrome',
      pid: 1,
    });
    expect(result).not.toBeNull();
    expect(result!.browser).toBe('Google Chrome');
  });

  it('detects known domains', () => {
    const result = detectBrowser({
      app: 'Google Chrome',
      title: 'GitHub - Explore - Google Chrome',
      pid: 1,
    });
    expect(result!.activeTab?.domain).toBe('github.com');
  });

  it('detects Brave', () => {
    const result = detectBrowser({ app: 'Brave Browser', title: 'Test - Brave Browser', pid: 1 });
    expect(result!.browser).toBe('Brave Browser');
  });
});
