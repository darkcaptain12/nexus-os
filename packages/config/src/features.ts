export interface FeatureFlag {
  enabled: boolean;
  description: string;
}

export const featureFlags = {
  AI: {
    enabled: false,
    description: 'AI agents and LLM integration',
  },
  TRADING: {
    enabled: false,
    description: 'Trading engine and market analysis',
  },
  SHOPIFY: {
    enabled: false,
    description: 'Shopify e-commerce integration',
  },
  DESKTOP_AGENT: {
    enabled: false,
    description: 'Desktop automation agent',
  },
  MEMORY: {
    enabled: false,
    description: 'Memory and knowledge engine',
  },
  VOICE: {
    enabled: false,
    description: 'Voice assistant interface',
  },
  AUTOMATION: {
    enabled: false,
    description: 'Workflow automation engine',
  },
  NOTIFICATIONS: {
    enabled: false,
    description: 'Multi-channel notification system',
  },
  BROWSER_EXTENSION: {
    enabled: false,
    description: 'Browser extension for web automation',
  },
  MOBILE: {
    enabled: false,
    description: 'Mobile application',
  },
} as const satisfies Record<string, FeatureFlag>;

export type FeatureName = keyof typeof featureFlags;

export function isFeatureEnabled(feature: FeatureName): boolean {
  const envKey = `NEXT_PUBLIC_FEATURE_${feature}`;
  const envValue = typeof process !== 'undefined' ? process.env[envKey] : undefined;
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  return featureFlags[feature].enabled;
}
