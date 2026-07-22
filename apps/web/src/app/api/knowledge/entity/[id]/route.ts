import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { getRelated } from '@/lib/knowledge/relationship-engine';

async function handleGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const graph = getKnowledgeGraph();
  const node = graph.getNode(id);
  if (!node) {
    return NextResponse.json({ error: 'Entity bulunamadı' }, { status: 404 });
  }
  return NextResponse.json({
    entity: node,
    degree: graph.degree(id),
    related: getRelated(id, undefined, 20).map(({ node: n, edge, direction }) => ({
      id: n.id,
      type: n.type,
      name: n.name,
      relation: edge.relation,
      direction,
      weight: edge.weight,
    })),
  });
}

export const GET = withErrorBoundary(handleGET);
