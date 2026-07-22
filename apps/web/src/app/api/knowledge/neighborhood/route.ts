import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';

const QuerySchema = z.object({
  nodeId: z.string().uuid(),
  depth: z.coerce.number().int().min(1).max(3).default(1),
  maxNodes: z.coerce.number().int().min(5).max(200).default(50),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { nodeId, depth, maxNodes } = parsed.data;
  const hood = getKnowledgeGraph().getNeighborhood(nodeId, depth, maxNodes);
  if (!hood) {
    return NextResponse.json({ error: 'Node bulunamadı' }, { status: 404 });
  }
  return NextResponse.json({ neighborhood: hood });
}

export const GET = withErrorBoundary(handleGET);
