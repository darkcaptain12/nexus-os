import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// Timeline Graph: son ilişkiler kronolojik — "ne, ne zaman, neye bağlandı"
async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const graph = getKnowledgeGraph();
  const timeline = graph.getRecentEdges(parsed.data.limit).map(({ edge, source, target }) => ({
    at: edge.createdAt,
    relation: edge.relation,
    source: { type: source.type, name: source.name },
    target: { type: target.type, name: target.name },
  }));
  return NextResponse.json({ timeline });
}

export const GET = withErrorBoundary(handleGET);
