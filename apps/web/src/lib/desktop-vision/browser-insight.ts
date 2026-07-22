import type { BrowserInsight, KnownBrowser } from './types';

// Browser Intelligence — yalnız AKTİF çalışma bağlamı. Geçmiş tarayıcı verisi
// TOPLANMAZ (spec kuralı): sadece şu an açık sekmenin domain/başlık/bağlamı.

const BROWSER_MAP: { match: RegExp; browser: KnownBrowser; name: string }[] = [
  { match: /brave/i, browser: 'brave', name: 'Brave' },
  { match: /edge|microsoft edge/i, browser: 'edge', name: 'Edge' },
  { match: /chrome|google chrome/i, browser: 'chrome', name: 'Chrome' },
  { match: /safari/i, browser: 'safari', name: 'Safari' },
];

// Domain → çalışma bağlamı sınıflandırması
const CONTEXT_DOMAINS: { pattern: RegExp; context: BrowserInsight['workContext'] }[] = [
  {
    pattern:
      /github\.com|gitlab\.com|bitbucket|stackoverflow|localhost|127\.0\.0\.1|vercel|netlify/i,
    context: 'development',
  },
  { pattern: /binance|okx|bybit|mexc|tradingview|coinmarketcap|coingecko/i, context: 'trading' },
  {
    pattern: /gmail|mail\.|slack|discord|teams|zoom|meet\.google|outlook/i,
    context: 'communication',
  },
  { pattern: /docs\.|documentation|readme|notion|confluence|wiki/i, context: 'documentation' },
  { pattern: /google\.com\/search|scholar|arxiv|wikipedia|medium|dev\.to/i, context: 'research' },
];

function detectBrowserKind(app: string): { browser: KnownBrowser; name: string } | null {
  for (const entry of BROWSER_MAP) {
    if (entry.match.test(app)) return { browser: entry.browser, name: entry.name };
  }
  return null;
}

const DOMAIN_SEPARATORS = [' - ', ' — ', ' – ', ' | '];

function extractDomain(
  title: string,
  browserName: string,
): { domain?: string; pageTitle?: string } {
  for (const sep of DOMAIN_SEPARATORS) {
    const parts = title.split(sep);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]!.trim();
      if (new RegExp(browserName, 'i').test(last)) {
        const pageTitle = parts.slice(0, -1).join(sep).trim();
        const domainMatch = pageTitle.match(
          /(?:https?:\/\/)?([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/i,
        );
        return { domain: domainMatch?.[1], pageTitle };
      }
    }
  }
  // Ayraç yok: doğrudan URL/domain ara
  const direct = title.match(/(?:https?:\/\/)?([a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/i);
  return { domain: direct?.[1], pageTitle: title };
}

function classifyWorkContext(
  domain: string | undefined,
  title: string,
): BrowserInsight['workContext'] {
  const haystack = `${domain ?? ''} ${title}`;
  for (const entry of CONTEXT_DOMAINS) {
    if (entry.pattern.test(haystack)) return entry.context;
  }
  return 'other';
}

export function analyzeBrowser(app: string, windowTitle: string): BrowserInsight | null {
  const kind = detectBrowserKind(app);
  if (!kind) return null;

  const { domain, pageTitle } = extractDomain(windowTitle, kind.name);

  return {
    browser: kind.browser,
    browserName: kind.name,
    activeTabTitle: pageTitle,
    domain,
    workContext: classifyWorkContext(domain, windowTitle),
    detectedAt: new Date().toISOString(),
  };
}
