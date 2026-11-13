import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  intelligenceScore,
  intelligenceScoreTrend,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  view: z.enum(['score', 'trend']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'trend') return NextResponse.json({ trend: intelligenceScoreTrend() });
  return NextResponse.json({ score: await intelligenceScore() });
}

export const GET = withErrorBoundary(handleGET);
