import type { ActiveWindow, BrowserState } from '../types';

const BROWSERS = new Set([
  'Google Chrome', 'Chrome', 'Brave Browser', 'Brave',
  'Firefox', 'Safari', 'Microsoft Edge', 'Arc', 'Opera', 'Vivaldi',
]);

export function detectBrowser(window: ActiveWindow | null): BrowserState | null {
  if (!window) return null;
  if (!BROWSERS.has(window.app)) return null;

  const domain = extractDomain(window.title);
  const activeTab = domain
    ? { title: window.title, domain, windowId: 0 }
    : undefined;

  return {
    browser: window.app,
    tabs: activeTab ? [activeTab] : [],
    activeTab,
    tabCount: activeTab ? 1 : 0,
  };
}

function extractDomain(title: string): string {
  const separators = [' - ', ' — ', ' – ', ' | '];
  for (const sep of separators) {
    const parts = title.split(sep);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]!.trim();
      if (BROWSERS.has(last)) {
        const pageTitle = parts.slice(0, -1).join(sep);
        const domainMatch = pageTitle.match(/(?:https?:\/\/)?([^/\s]+\.[a-z]{2,})/i);
        return domainMatch ? domainMatch[1]! : inferDomain(pageTitle);
      }
    }
  }
  return 'unknown';
}

function inferDomain(title: string): string {
  const known: Record<string, string> = {
    'GitHub': 'github.com', 'Gmail': 'mail.google.com', 'YouTube': 'youtube.com',
    'Stack Overflow': 'stackoverflow.com', 'Google': 'google.com',
    'Twitter': 'twitter.com', 'LinkedIn': 'linkedin.com', 'Reddit': 'reddit.com',
    'ChatGPT': 'chatgpt.com', 'Claude': 'claude.ai', 'Vercel': 'vercel.com',
    'Supabase': 'supabase.com', 'Figma': 'figma.com', 'Notion': 'notion.so',
  };
  for (const [keyword, domain] of Object.entries(known)) {
    if (title.includes(keyword)) return domain;
  }
  return 'unknown';
}
