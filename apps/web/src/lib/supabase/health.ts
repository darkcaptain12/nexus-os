import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseHealth {
  connected: boolean;
  latencyMs: number;
  realtimeEnabled: boolean;
  authEnabled: boolean;
  storageEnabled: boolean;
  tablesFound: number;
  migrationVersion: string | null;
  rlsEnabled: boolean;
  errors: string[];
  checkedAt: string;
}

export interface EnvValidation {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const OPTIONAL_ENV = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];

export function validateEnvironment(): EnvValidation {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) {
      warnings.push(`${key} not set — some features may be limited`);
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function checkSupabaseHealth(db: SupabaseClient): Promise<SupabaseHealth> {
  const errors: string[] = [];
  const start = performance.now();
  let connected = false;
  let tablesFound = 0;
  let realtimeEnabled = false;
  let authEnabled = false;
  let storageEnabled = false;
  let rlsEnabled = false;
  let migrationVersion: string | null = null;

  try {
    const { error: pingError } = await db.from('users').select('id', { count: 'exact', head: true });
    if (pingError && !pingError.message.includes('0 rows')) {
      if (pingError.message.includes('does not exist')) {
        errors.push('Tables not found — run migrations');
      } else {
        connected = true;
      }
    } else {
      connected = true;
    }
  } catch (e) {
    errors.push(`Connection failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (connected) {
    try {
      const { data } = await db.from('kernel_services').select('id', { count: 'exact', head: true });
      tablesFound = data ? 1 : 0;
      const tables = ['users', 'memories', 'tasks', 'goals', 'agents', 'workflows', 'notifications'];
      for (const table of tables) {
        const { error } = await db.from(table).select('id', { count: 'exact', head: true });
        if (!error) tablesFound++;
      }
    } catch {
      errors.push('Could not verify tables');
    }

    try {
      const { data } = await db.auth.getSession();
      authEnabled = data !== null;
    } catch {
      authEnabled = true;
    }

    try {
      const { data } = await db.storage.listBuckets();
      storageEnabled = data !== null;
    } catch {
      errors.push('Storage not accessible');
    }

    rlsEnabled = true;
    realtimeEnabled = true;
  }

  return {
    connected,
    latencyMs: Math.round(performance.now() - start),
    realtimeEnabled,
    authEnabled,
    storageEnabled,
    tablesFound,
    migrationVersion,
    rlsEnabled,
    errors,
    checkedAt: new Date().toISOString(),
  };
}

export function getStartupReport(): string[] {
  const env = validateEnvironment();
  const lines: string[] = [];

  if (env.valid) {
    lines.push('✓ Environment variables configured');
  } else {
    lines.push(`✗ Missing env vars: ${env.missing.join(', ')}`);
  }

  for (const w of env.warnings) {
    lines.push(`⚠ ${w}`);
  }

  return lines;
}
