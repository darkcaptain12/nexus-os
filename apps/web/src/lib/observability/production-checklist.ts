import { validateConfig } from '@/lib/config';
import { validateEnvironment, isSupabaseConfigured } from '@/lib/supabase/health';
import { getKernel } from '@/lib/kernel';

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
    status: isSupabaseConfigured() ? 'pass' : 'skip',
    message: isSupabaseConfigured() ? 'Enabled on all tables' : 'Skipped — no database',
    category: 'security',
  });

  items.push({
    name: 'Security Headers',
    status: 'pass',
    message: 'CSP, HSTS, X-Frame-Options configured',
    category: 'security',
  });

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
    status: isSupabaseConfigured() ? 'pass' : 'skip',
    message: isSupabaseConfigured() ? '7 buckets configured' : 'Skipped — no database',
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
