import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// Mobil-uyumlu düz JSON: node + edge listeleri, sayfalı (lazy loading)
async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { limit, offset } = parsed.data;
  const graph = getKnowledgeGraph();
  return NextResponse.json({
    nodes: graph.getAllNodes(limit, offset),
    edges: graph.getAllEdges(limit * 2, offset),
    stats: {
      nodeCount: graph.getStatistics().nodeCount,
      edgeCount: graph.getStatistics().edgeCount,
    },
  });
}

export const GET = withErrorBoundary(handleGET);
