import type { ConfigSnapshot, ConfigProvider } from './types';
import { getAppConfig } from '@/lib/config';
import { featureFlags } from '@apex-os/config';

// Configuration Manager — tek merkezden API Keys/Provider Settings/Feature Flags/
// Security/Trading/Commerce/Voice/Mobile görünümü. Env-based okuma (secret DEĞER
// asla dönmez, yalnız set/unset). Mevcut getAppConfig + featureFlags REUSE.

interface ProviderSpec {
  name: string;
  category: ConfigProvider['category'];
  keys: { key: string; public: boolean }[];
}

const PROVIDER_SPECS: ProviderSpec[] = [
  {
    name: 'Supabase',
    category: 'database',
    keys: [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', public: true },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', public: true },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', public: false },
    ],
  },
  { name: 'AI (Anthropic)', category: 'ai', keys: [{ key: 'ANTHROPIC_API_KEY', public: false }] },
  { name: 'AI (OpenAI)', category: 'ai', keys: [{ key: 'OPENAI_API_KEY', public: false }] },
  {
    name: 'Trading (OKX)',
    category: 'trading',
    keys: [
      { key: 'OKX_API_KEY', public: false },
      { key: 'OKX_API_SECRET', public: false },
    ],
  },
  {
    name: 'Commerce (Shopify)',
    category: 'commerce',
    keys: [
      { key: 'SHOPIFY_API_KEY', public: false },
      { key: 'SHOPIFY_API_SECRET', public: false },
    ],
  },
  {
    name: 'Notification (Telegram)',
    category: 'notification',
    keys: [{ key: 'TELEGRAM_BOT_TOKEN', public: false }],
  },
  {
    name: 'Notification (Discord)',
    category: 'notification',
    keys: [{ key: 'DISCORD_WEBHOOK_URL', public: false }],
  },
  {
    name: 'Voice (STT/TTS)',
    category: 'voice',
    keys: [{ key: 'VOICE_PROVIDER_KEY', public: false }],
  },
  {
    name: 'Desktop Agent',
    category: 'desktop',
    keys: [{ key: 'DESKTOP_AGENT_TOKEN', public: false }],
  },
  {
    name: 'Cloud Sync',
    category: 'cloud',
    keys: [{ key: 'NEXT_PUBLIC_SUPABASE_URL', public: true }],
  },
];

function buildProvider(spec: ProviderSpec): ConfigProvider {
  const envKeys = spec.keys.map((k) => ({
    key: k.key,
    set: !!process.env[k.key],
    public: k.public,
  }));
  return {
    name: spec.name,
    category: spec.category,
    configured: envKeys.every((k) => k.set),
    envKeys,
  };
}

export function getConfigSnapshot(): ConfigSnapshot {
  const app = getAppConfig();
  const providers = PROVIDER_SPECS.map(buildProvider);

  const flags: Record<string, boolean> = {};
  for (const [name, def] of Object.entries(featureFlags)) {
    const envKey = `NEXT_PUBLIC_FEATURE_${name}`;
    flags[name] = process.env[envKey] === 'true' || def.enabled;
  }

  const appUrl = app.appUrl;
  return {
    environment: app.environment,
    appUrl,
    featureFlags: flags,
    providers,
    security: {
      httpsEnforced: appUrl.startsWith('https://') || appUrl.includes('localhost'),
      serviceRoleSafe: !process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, // public'e sızmamış
      rateLimitEnabled: true, // middleware'de aktif (S9)
    },
    configuredProviders: providers.filter((p) => p.configured).length,
    totalProviders: providers.length,
    generatedAt: new Date().toISOString(),
  };
}

/** Belirli kategori sağlayıcıları — Configuration Manager UI filtresi. */
export function getProvidersByCategory(category: ConfigProvider['category']): ConfigProvider[] {
  return PROVIDER_SPECS.filter((s) => s.category === category).map(buildProvider);
}
