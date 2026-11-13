import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  weeklyCeoReport,
  monthlyReview,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  period: z.enum(['weekly', 'monthly']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.period === 'monthly') return NextResponse.json({ report: await monthlyReview() });
  return NextResponse.json({ report: await weeklyCeoReport() });
}

export const GET = withErrorBoundary(handleGET);
