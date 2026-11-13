import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  devMarketplaceInstall,
  devInstall,
} from '@/lib/plugins/services/developer-platform-service';

const PERMISSIONS = [
  'trading',
  'commerce',
  'desktop',
  'voice',
  'filesystem',
  'clipboard',
  'notifications',
  'workflow',
  'network',
] as const;
const CATEGORIES = [
  'ecommerce',
  'communication',
  'payment',
  'storage',
  'productivity',
  'design',
  'developer',
  'other',
] as const;

const MarketInstallSchema = z.object({
  source: z.literal('marketplace'),
  pluginId: z.string().min(1),
  grantAll: z.boolean().default(false),
});
const ManifestInstallSchema = z.object({
  source: z.literal('manifest'),
  manifest: z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    author: z.string(),
    permissions: z.array(z.enum(PERMISSIONS)),
    actions: z.array(z.string()),
    hooks: z.array(z.string()),
    settings: z.record(z.string(), z.any()).default({}),
    icon: z.string(),
    category: z.enum(CATEGORIES),
  }),
  grantAll: z.boolean().default(false),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const market = MarketInstallSchema.safeParse(body);
  if (market.success) {
    const result = devMarketplaceInstall(market.data.pluginId, market.data.grantAll);
    return NextResponse.json(result, { status: result.ok ? 201 : 422 });
  }
  const manifest = ManifestInstallSchema.safeParse(body);
  if (manifest.success) {
    const result = devInstall(
      manifest.data.manifest as Parameters<typeof devInstall>[0],
      manifest.data.grantAll,
    );
    return NextResponse.json(result, { status: result.ok ? 201 : 422 });
  }
  return NextResponse.json({ error: 'source: marketplace | manifest gerekli' }, { status: 400 });
}

export const POST = withErrorBoundary(handlePOST);
