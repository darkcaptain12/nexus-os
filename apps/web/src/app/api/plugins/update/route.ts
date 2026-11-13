import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { devMarketplaceUpdate } from '@/lib/plugins/services/developer-platform-service';

const UpdateSchema = z.object({ pluginId: z.string().min(1) });

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = devMarketplaceUpdate(parsed.data.pluginId);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

export const POST = withErrorBoundary(handlePOST);
