import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  goals,
  goalProgress,
  goalPriorities,
  createGoal,
  deleteGoal,
} from '@/lib/executive/optimization/services/self-optimization-service';

const METRICS = [
  'net_profit',
  'products_published',
  'trading_analyses',
  'roas',
  'agent_success_rate',
  'workflow_completions',
] as const;

const QuerySchema = z.object({
  view: z.enum(['list', 'progress', 'priorities']).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    label: z.string().min(1).max(120),
    metric: z.enum(METRICS),
    target: z.number().positive(),
    period: z.enum(['daily', 'weekly', 'monthly']),
  }),
  z.object({ action: z.literal('delete'), id: z.string().min(1) }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'priorities')
    return NextResponse.json({ priorities: await goalPriorities() });
  if (parsed.data.view === 'list') return NextResponse.json({ goals: goals() });
  return NextResponse.json({ progress: await goalProgress() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.action === 'create') {
    return NextResponse.json(
      {
        goal: createGoal({
          label: input.label,
          metric: input.metric,
          target: input.target,
          period: input.period,
        }),
      },
      { status: 201 },
    );
  }
  return NextResponse.json({ deleted: deleteGoal(input.id) });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
