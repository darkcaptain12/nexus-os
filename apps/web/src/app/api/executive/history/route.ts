import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  selfReviewHistory,
  intelligenceScoreTrend,
  learningReport,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(90).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const limit = parsed.data.limit;
  return NextResponse.json({
    reviews: selfReviewHistory(limit),
    intelligenceTrend: intelligenceScoreTrend(),
    learning: learningReport(),
  });
}

export const GET = withErrorBoundary(handleGET);
