import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { searchKnowledge } from '@/lib/knowledge/semantic-search';
import type { KnowledgeNodeType, RelationType } from '@/lib/knowledge/types';

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
const RELATIONS = [
  'related_to',
  'created_by',
  'belongs_to',
  'depends_on',
  'blocked_by',
  'generated_from',
  'references',
  'follows',
  'owns',
  'affects',
  'uses',
] as const;

// Hibrit arama — tek sorguda keyword + entity + relationship + timeline
const SearchSchema = z.object({
  keyword: z.string().max(200).optional(),
  types: z.array(z.enum(NODE_TYPES)).optional(),
  relations: z.array(z.enum(RELATIONS)).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  nearNodeId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = searchKnowledge({
    ...parsed.data,
    types: parsed.data.types as KnowledgeNodeType[] | undefined,
    relations: parsed.data.relations as RelationType[] | undefined,
  });
  return NextResponse.json({
    results: result.results.map((r) => ({
      id: r.node.id,
      type: r.node.type,
      name: r.node.name,
      content: r.node.content,
      score: Number(r.score.toFixed(3)),
      matchedOn: r.matchedOn,
      updatedAt: r.node.updatedAt,
    })),
    total: result.total,
    durationMs: result.durationMs,
  });
}

export const POST = withErrorBoundary(handlePOST);
