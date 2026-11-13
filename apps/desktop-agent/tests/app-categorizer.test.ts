import { describe, it, expect } from 'vitest';
import {
  categorizeApp,
  isSensitiveApp,
  shouldTrackWindow,
  getCategoryLabel,
} from '../src/collectors/app-categorizer';

describe('App Categorizer', () => {
  it('categorizes coding apps', () => {
    expect(categorizeApp('Code')).toBe('coding');
    expect(categorizeApp('Cursor')).toBe('coding');
    expect(categorizeApp('WebStorm')).toBe('coding');
    expect(categorizeApp('Xcode')).toBe('coding');
  });

  it('categorizes browsers', () => {
    expect(categorizeApp('Google Chrome')).toBe('browsing');
    expect(categorizeApp('Safari')).toBe('browsing');
    expect(categorizeApp('Arc')).toBe('browsing');
    expect(categorizeApp('Firefox')).toBe('browsing');
  });

  it('categorizes communication', () => {
    expect(categorizeApp('Slack')).toBe('communication');
    expect(categorizeApp('Discord')).toBe('communication');
    expect(categorizeApp('Mail')).toBe('communication');
  });

  it('categorizes meetings', () => {
    expect(categorizeApp('Zoom')).toBe('meeting');
    expect(categorizeApp('Microsoft Teams')).toBe('meeting');
  });

  it('categorizes design', () => {
    expect(categorizeApp('Figma')).toBe('design');
    expect(categorizeApp('Sketch')).toBe('design');
  });

  it('categorizes writing', () => {
    expect(categorizeApp('Notion')).toBe('writing');
    expect(categorizeApp('Obsidian')).toBe('writing');
  });

  it('categorizes terminal', () => {
    expect(categorizeApp('Terminal')).toBe('terminal');
    expect(categorizeApp('iTerm2')).toBe('terminal');
    expect(categorizeApp('Warp')).toBe('terminal');
  });

  it('returns other for unknown', () => {
    expect(categorizeApp('RandomApp')).toBe('other');
  });

  it('gets category label in Turkish', () => {
    expect(getCategoryLabel('coding')).toBe('Kodlama');
    expect(getCategoryLabel('meeting')).toBe('Toplantı');
  });
});

describe('Privacy', () => {
  it('detects sensitive apps', () => {
    expect(isSensitiveApp('1Password', ['1Password', 'KeePassXC'])).toBe(true);
    expect(isSensitiveApp('Code', ['1Password'])).toBe(false);
  });

  it('blocks sensitive window titles', () => {
    expect(shouldTrackWindow('Chrome', 'My Passwords - Chrome', [])).toBe(false);
    expect(shouldTrackWindow('Chrome', 'Incognito Tab', [])).toBe(false);
    expect(shouldTrackWindow('Chrome', 'GitHub - Chrome', [])).toBe(true);
  });

  it('blocks blacklisted apps', () => {
    expect(shouldTrackWindow('1Password', 'Vault', ['1Password'])).toBe(false);
  });

  it('allows normal windows', () => {
    expect(shouldTrackWindow('Code', 'main.ts — APEX-OS', [])).toBe(true);
  });
});
