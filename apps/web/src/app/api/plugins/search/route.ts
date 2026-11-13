import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { devMarketplace } from '@/lib/plugins/services/developer-platform-service';

const CATEGORIES = [
  'ecommerce',
  'communication',
  'payment',
  'storage',
  'productivity',
  'design',
  'developer',
  'other',
] as const;
const QuerySchema = z.object({
  q: z.string().max(80).optional(),
  category: z.enum(CATEGORIES).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ results: devMarketplace(parsed.data.category, parsed.data.q) });
}

export const GET = withErrorBoundary(handleGET);
