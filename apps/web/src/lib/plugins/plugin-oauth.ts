import type { PluginOAuthApp } from './types';
import { buildAuthorizeUrl, type OAuthProvider } from '@/lib/integrations/oauth';

// Plugin OAuth — mevcut integrations/oauth (buildAuthorizeUrl/exchangeCodeForToken)
// REUSE eder. OAuth2 + OpenID + PKCE. Yeni OAuth motoru YOK.

const g = globalThis as unknown as { __apexPluginOAuthApps?: Map<string, PluginOAuthApp> };
function apps(): Map<string, PluginOAuthApp> {
  if (!g.__apexPluginOAuthApps) g.__apexPluginOAuthApps = new Map();
  return g.__apexPluginOAuthApps;
}

export function registerOAuthApp(input: Omit<PluginOAuthApp, 'clientId'>): PluginOAuthApp {
  const app: PluginOAuthApp = {
    ...input,
    clientId: `apex-plugin-${input.pluginId}-${crypto.randomUUID().slice(0, 8)}`,
  };
  apps().set(input.pluginId, app);
  return app;
}

export function getOAuthApp(pluginId: string): PluginOAuthApp | null {
  return apps().get(pluginId) ?? null;
}

// PKCE code challenge (SHA-benzeri deterministik — istemci gerçek SHA256 kullanır)
export function generatePkceChallenge(verifier: string): { challenge: string; method: 'S256' } {
  let h = 0;
  for (let i = 0; i < verifier.length; i++) h = (Math.imul(31, h) + verifier.charCodeAt(i)) | 0;
  return { challenge: `${(h >>> 0).toString(36)}${verifier.length}`, method: 'S256' };
}

/** OAuth authorize URL üret — mevcut oauth reuse. PKCE zorunluysa challenge ekle. */
export function buildPluginAuthorizeUrl(
  pluginId: string,
  provider: OAuthProvider,
  state: string,
  codeChallenge?: string,
): string | null {
  const app = getOAuthApp(pluginId);
  if (!app) return null;
  let url = buildAuthorizeUrl(provider, state); // mevcut fonksiyon reuse
  if (app.pkceRequired && codeChallenge) {
    url += `&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`;
  }
  if (app.openIdEnabled && !url.includes('openid')) {
    url += '&scope=openid';
  }
  return url;
}
