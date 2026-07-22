import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceInventory } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

const QuerySchema = z.object({
  threshold: z.coerce.number().int().min(1).max(1000).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ inventory: await commerceInventory(parsed.data.threshold) });
}

export const GET = withErrorBoundary(handleGET);
