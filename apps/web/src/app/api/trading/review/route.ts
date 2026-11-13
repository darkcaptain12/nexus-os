import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveReview } from '@/lib/quant/live/services/live-trading-service';

const QuerySchema = z.object({ journalId: z.string().uuid() });

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const review = liveReview(parsed.data.journalId);
  if (!review) return NextResponse.json({ error: 'Journal kaydı bulunamadı' }, { status: 404 });
  return NextResponse.json({ review });
}

export const GET = withErrorBoundary(handleGET);
