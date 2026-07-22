import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { devUninstall } from '@/lib/plugins/services/developer-platform-service';

const RemoveSchema = z.object({ pluginId: z.string().min(1) });

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const removed = devUninstall(parsed.data.pluginId);
  return NextResponse.json({ removed });
}

export const POST = withErrorBoundary(handlePOST);
