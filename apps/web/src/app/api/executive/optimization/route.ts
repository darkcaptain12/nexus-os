import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  optimizationDashboard,
  tradingPerformance,
  commercePerformance,
  agentPerformance,
  workflowPerformance,
  revenueOverview,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  view: z.enum(['dashboard', 'trading', 'commerce', 'agent', 'workflow', 'revenue']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  switch (parsed.data.view) {
    case 'trading':
      return NextResponse.json({ performance: tradingPerformance() });
    case 'commerce':
      return NextResponse.json({ performance: await commercePerformance() });
    case 'agent':
      return NextResponse.json({ performance: agentPerformance() });
    case 'workflow':
      return NextResponse.json({ performance: workflowPerformance() });
    case 'revenue':
      return NextResponse.json({ overview: await revenueOverview() });
    default:
      return NextResponse.json({ dashboard: await optimizationDashboard() });
  }
}

export const GET = withErrorBoundary(handleGET);
