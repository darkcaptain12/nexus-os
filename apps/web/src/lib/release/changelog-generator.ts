import type { Changelog, ChangelogEntry } from './types';
import { APEX_VERSION } from './version-manager';

// Changelog Generator — Sprint 1-25 özeti. Gerçek sprint geçmişi (statik veri;
// bu proje sprint bazlı geliştirildi). Yeni/iyileştirme/hardening kategorileri.

const SPRINTS: ChangelogEntry[] = [
  {
    sprint: 1,
    title: 'Foundation & Monorepo',
    category: 'feature',
    highlights: ['pnpm+Turborepo', 'Next.js 16 App Router', 'TypeScript strict'],
  },
  {
    sprint: 2,
    title: 'Auth & Database',
    category: 'feature',
    highlights: ['Supabase Auth (SSR)', 'RLS politikaları', 'migration altyapısı'],
  },
  {
    sprint: 3,
    title: 'Kernel & Events',
    category: 'feature',
    highlights: ['@apex-os/kernel (DI/CQRS)', 'typed event bus', 'workflow engine'],
  },
  {
    sprint: 4,
    title: 'AI Provider Abstraction',
    category: 'feature',
    highlights: ['5 provider adapter', 'router + fallback', 'token telemetry'],
  },
  {
    sprint: 5,
    title: 'Memory Engine',
    category: 'feature',
    highlights: ['timeline/decisions/journals', 'pgvector embedding', 'hybrid search'],
  },
  {
    sprint: 6,
    title: 'Action Engine & Approval',
    category: 'feature',
    highlights: ['13 action def', 'risk-based approval', 'ApprovalQueue'],
  },
  {
    sprint: 7,
    title: 'Workflow Automation',
    category: 'feature',
    highlights: ['node handlers', 'scheduler (60s)', 'template sistemi'],
  },
  {
    sprint: 8,
    title: 'Integration Hub',
    category: 'feature',
    highlights: ['OAuth (GitHub/Google)', 'provider registry', 'event bridge'],
  },
  {
    sprint: 9,
    title: 'Security Middleware',
    category: 'hardening',
    highlights: ['CSP/headers', 'rate limiting', 'CSRF koruması'],
  },
  {
    sprint: 10,
    title: 'Production Readiness v1',
    category: 'hardening',
    highlights: ['health checks', 'error boundary', 'production checklist'],
  },
  {
    sprint: 11,
    title: 'Desktop Agent',
    category: 'feature',
    highlights: ['aktivite takibi', 'productivity engine', 'timeline sync'],
  },
  {
    sprint: 12,
    title: 'Dashboard & Widgets',
    category: 'feature',
    highlights: ['executive dashboard', 'widget sistemi', 'real-time'],
  },
  {
    sprint: 13,
    title: 'Agent Framework v1.0',
    category: 'feature',
    highlights: ['10 lifecycle state', 'scheduler', 'approval-gated steps'],
  },
  {
    sprint: 14,
    title: 'APEX Quant v1.0',
    category: 'feature',
    highlights: ['indikatörler+SMC', 'paper trading', 'OKX adapter', 'backtest'],
  },
  {
    sprint: 15,
    title: 'Knowledge Graph v2',
    category: 'feature',
    highlights: ['15 node/11 relation', 'auto-linker', 'context builder v2'],
  },
  {
    sprint: 16,
    title: 'Desktop Intelligence',
    category: 'feature',
    highlights: ['Vision/OCR', 'screen understanding', 'context builder v3'],
  },
  {
    sprint: 17,
    title: 'Voice AI "Hey APEX"',
    category: 'feature',
    highlights: ['wake word', 'STT/TTS pluggable', 'follow-up conversation'],
  },
  {
    sprint: 18,
    title: 'Mobile Platform',
    category: 'feature',
    highlights: ['facade layer', 'offline-first', 'push engine', 'Apple Watch'],
  },
  {
    sprint: 19,
    title: 'Commerce Intelligence',
    category: 'feature',
    highlights: ['product discovery/scoring', 'ad optimizer', 'revenue intelligence'],
  },
  {
    sprint: 20,
    title: 'Live Trading Automation',
    category: 'feature',
    highlights: ['Risk Engine v2', 'trade journal', 'AI trade review'],
  },
  {
    sprint: 21,
    title: 'Developer Platform',
    category: 'feature',
    highlights: ['Plugin SDK', 'Marketplace (12 plugin)', 'Public API', 'webhooks'],
  },
  {
    sprint: 22,
    title: 'Cloud Sync + Multi Device',
    category: 'feature',
    highlights: ['delta sync', 'conflict resolution', 'handoff', 'device trust'],
  },
  {
    sprint: 23,
    title: 'AI Automation & Optimization',
    category: 'feature',
    highlights: ['self-review', 'learning engine', 'intelligence score', 'CEO report'],
  },
  {
    sprint: 24,
    title: 'Production Hardening Final',
    category: 'hardening',
    highlights: ['stability/recovery audit', 'load test', 'RC score', 'alert engine'],
  },
  {
    sprint: 25,
    title: 'APEX OS v1.0 Release',
    category: 'hardening',
    highlights: ['installation wizard', 'config manager', 'backup/export', 'production score'],
  },
];

export function generateChangelog(): Changelog {
  const features = SPRINTS.filter((s) => s.category === 'feature').length;
  const improvements = SPRINTS.filter((s) => s.category === 'improvement').length;
  const hardening = SPRINTS.filter((s) => s.category === 'hardening').length;

  return {
    version: APEX_VERSION,
    generatedAt: new Date().toISOString(),
    totalSprints: SPRINTS.length,
    entries: [...SPRINTS].reverse(), // en yeni önce
    summary: { newModules: features, improvements, hardening },
  };
}
