import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { cloudHistory, cloudRoutedHistory } from '@/lib/cloud/services/cloud-service';

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  view: z.enum(['routed']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'routed')
    return NextResponse.json({ routed: cloudRoutedHistory(parsed.data.limit) });
  return NextResponse.json(cloudHistory(parsed.data.limit));
}

export const GET = withErrorBoundary(handleGET);
