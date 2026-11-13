import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { findSimilar } from '@/lib/knowledge/semantic-search';

const QuerySchema = z.object({
  nodeId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const similar = findSimilar(parsed.data.nodeId, parsed.data.limit);
  return NextResponse.json({
    similar: similar.map((s) => ({
      id: s.node.id,
      type: s.node.type,
      name: s.node.name,
      score: s.score,
    })),
  });
}

export const GET = withErrorBoundary(handleGET);
