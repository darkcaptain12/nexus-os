import { NextResponse } from 'next/server';
import { validateConfig } from '@/lib/config';
import { validateEnvironment, isSupabaseConfigured } from '@/lib/supabase/health';
import { getKernel } from '@/lib/kernel';
import { applySecurityHeaders } from '@/lib/security/headers';

export interface ChecklistItem {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  category: 'environment' | 'database' | 'security' | 'services' | 'deployment';
}

export interface ProductionReadinessReport {
  score: number;
  ready: boolean;
  items: ChecklistItem[];
  timestamp: string;
}

export async function generateProductionChecklist(): Promise<ProductionReadinessReport> {
  const items: ChecklistItem[] = [];

  const env = validateEnvironment();
  items.push({
    name: 'Environment Variables',
    status: env.valid ? 'pass' : 'fail',
    message: env.valid ? 'All required vars set' : `Missing: ${env.missing.join(', ')}`,
    category: 'environment',
  });

  const config = validateConfig();
  items.push({
    name: 'Configuration',
    status: config.valid ? 'pass' : 'fail',
    message: config.valid ? 'Valid configuration' : config.errors.join('; '),
    category: 'environment',
  });

  items.push({
    name: 'Supabase Connection',
    status: isSupabaseConfigured() ? 'pass' : 'warn',
    message: isSupabaseConfigured() ? 'Configured' : 'Not configured — mock mode',
    category: 'database',
  });

  items.push({
    name: 'RLS Policies',
    status: isSupabaseConfigured() ? 'warn' : 'skip',
    message: isSupabaseConfigured()
      ? 'Cannot verify without a pg_policies query (service-role) — not checked, do not assume enabled'
      : 'Skipped — no database',
    category: 'security',
  });

  items.push(checkSecurityHeadersReal());

  try {
    const { kernel, ready } = getKernel();
    await ready;
    const status = kernel.getStatus();
    items.push({
      name: 'Kernel',
      status: status.phase === 'running' ? 'pass' : 'fail',
      message: `Phase: ${status.phase}, ${status.services.running}/${status.services.total} services`,
      category: 'services',
    });
  } catch {
    items.push({ name: 'Kernel', status: 'fail', message: 'Failed to boot', category: 'services' });
  }

  items.push({
    name: 'Storage Buckets',
    status: isSupabaseConfigured() ? 'warn' : 'skip',
    message: isSupabaseConfigured()
      ? 'Supabase is configured, but bucket existence/count is not verified here — would require an async storage.listBuckets() call'
      : 'Skipped — no database',
    category: 'database',
  });

  items.push({
    name: 'Deployment Target',
    status: process.env.VERCEL ? 'pass' : 'warn',
    message: process.env.VERCEL ? 'Vercel detected' : 'Local environment',
    category: 'deployment',
  });

  const passCount = items.filter((i) => i.status === 'pass').length;
  const totalChecked = items.filter((i) => i.status !== 'skip').length;
  const score = totalChecked > 0 ? Math.round((passCount / totalChecked) * 100) : 0;

  return {
    score,
    ready: items.filter((i) => i.status === 'fail' && i.category !== 'deployment').length === 0,
    items,
    timestamp: new Date().toISOString(),
  };
}

/** Real check: actually invokes applySecurityHeaders() and inspects the resulting headers, instead of asserting it works. */
function checkSecurityHeadersReal(): ChecklistItem {
  const probe = applySecurityHeaders(NextResponse.next());
  const required = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ];
  const missing = required.filter((h) => !probe.headers.get(h));

  return {
    name: 'Security Headers',
    status: missing.length === 0 ? 'pass' : 'fail',
    message:
      missing.length === 0
        ? `Verified present: ${required.join(', ')}`
        : `Missing headers: ${missing.join(', ')}`,
    category: 'security',
  };
}
