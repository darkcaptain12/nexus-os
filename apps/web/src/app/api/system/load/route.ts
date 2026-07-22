import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { loadTest } from '@/lib/observability/production/services/production-service';

const QuerySchema = z.object({
  iterations: z.coerce.number().int().min(1).max(500).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ report: await loadTest(parsed.data.iterations) });
}

export const GET = withErrorBoundary(handleGET);
