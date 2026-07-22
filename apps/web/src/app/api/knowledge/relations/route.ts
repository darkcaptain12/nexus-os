import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';
import { link, VALID_RELATIONS, RELATION_SEMANTICS } from '@/lib/knowledge/relationship-engine';

const NODE_TYPES = [
  'person',
  'company',
  'project',
  'task',
  'goal',
  'decision',
  'meeting',
  'note',
  'file',
  'website',
  'workflow',
  'agent',
  'trade',
  'strategy',
  'exchange',
] as const;

const CreateRelationSchema = z.object({
  source: z.object({ type: z.enum(NODE_TYPES), name: z.string().min(1).max(200) }),
  relation: z.enum(VALID_RELATIONS as [string, ...string[]]),
  target: z.object({ type: z.enum(NODE_TYPES), name: z.string().min(1).max(200) }),
  weight: z.number().min(0).max(1).default(0.7),
});

async function handleGET() {
  const graph = getKnowledgeGraph();
  return NextResponse.json({
    recent: graph.getRecentEdges(30).map(({ edge, source, target }) => ({
      relation: edge.relation,
      weight: edge.weight,
      createdAt: edge.createdAt,
      source: { id: source.id, type: source.type, name: source.name },
      target: { id: target.id, type: target.type, name: target.name },
    })),
    semantics: RELATION_SEMANTICS,
  });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateRelationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { source, relation, target, weight } = parsed.data;
  const result = link(source, relation as (typeof VALID_RELATIONS)[number], target, weight);
  return NextResponse.json(
    {
      source: result.source,
      target: result.target,
      edge: result.edge,
    },
    { status: 201 },
  );
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
