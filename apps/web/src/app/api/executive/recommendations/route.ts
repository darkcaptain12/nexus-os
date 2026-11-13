import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  allRecommendations,
  recommendationsRequiringApproval,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  domain: z.enum(['revenue', 'trading', 'commerce', 'agent', 'workflow']).optional(),
  approvalOnly: z.enum(['true']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.approvalOnly === 'true') {
    return NextResponse.json({ recommendations: await recommendationsRequiringApproval() });
  }
  let recs = await allRecommendations();
  if (parsed.data.domain) recs = recs.filter((r) => r.domain === parsed.data.domain);
  return NextResponse.json({ recommendations: recs });
}

export const GET = withErrorBoundary(handleGET);
