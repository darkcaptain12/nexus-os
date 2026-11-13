import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceQueue } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

const QuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'published', 'rejected']).optional(),
});

// Hunter kuyruğundaki skorlanmış ürünler
async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ products: commerceQueue(parsed.data.status) });
}

export const GET = withErrorBoundary(handleGET);
