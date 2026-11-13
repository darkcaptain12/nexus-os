import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  selfReview,
  selfReviewHistory,
  runDailyReview,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  view: z.enum(['latest', 'history']).optional(),
  limit: z.coerce.number().min(1).max(90).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'history')
    return NextResponse.json({ history: selfReviewHistory(parsed.data.limit) });
  return NextResponse.json({ review: selfReview() });
}

async function handlePOST() {
  // Günlük self review çalıştır + başarısızlıklardan öğren (Learning Engine)
  return NextResponse.json(runDailyReview());
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
