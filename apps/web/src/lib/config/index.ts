export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  environment: Environment;
  appUrl: string;
  supabase: { url: string; anonKey: string; configured: boolean };
  features: Record<string, boolean>;
  debug: boolean;
}

export function getAppConfig(): AppConfig {
  const env = (process.env.NODE_ENV ?? 'development') as Environment;
  return {
    environment: env,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    features: {
      ai: process.env.NEXT_PUBLIC_FEATURE_AI === 'true',
      trading: process.env.NEXT_PUBLIC_FEATURE_TRADING === 'true',
      desktop: process.env.NEXT_PUBLIC_FEATURE_DESKTOP_AGENT === 'true',
    },
    debug: env !== 'production',
  };
}

export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = getAppConfig();

  if (config.environment === 'production') {
    if (!config.supabase.configured) errors.push('Supabase not configured for production');
    if (!config.appUrl || config.appUrl.includes('localhost')) errors.push('APP_URL must be set for production');
  }

  if (!config.supabase.configured) {
    warnings.push('Running without Supabase — mock mode active');
  }

  return { valid: errors.length === 0, errors, warnings };
}
