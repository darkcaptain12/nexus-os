import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  releaseDashboard,
  releaseAudit,
  productionScore,
} from '@/lib/release/services/release-service';

// documentation-audit node:fs (existsSync) kullanır → Node.js runtime zorunlu (Edge değil)
export const runtime = 'nodejs';

const QuerySchema = z.object({
  view: z.enum(['dashboard', 'audit', 'score']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  switch (parsed.data.view) {
    case 'audit':
      return NextResponse.json({ audit: await releaseAudit() });
    case 'score':
      return NextResponse.json({ score: await productionScore() });
    default:
      return NextResponse.json({ dashboard: await releaseDashboard() });
  }
}

export const GET = withErrorBoundary(handleGET);
