import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { runScenario } from '@/lib/ai/executive';

const ScenarioInputSchema = z.object({
  type: z.enum(['task_postponed', 'project_first', 'delegate', 'change_plan']),
  subjectId: z.string().optional(),
  subjectTitle: z.string().optional(),
  description: z.string().min(1, 'description required'),
});

async function handlePOST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ScenarioInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runScenario(parsed.data);
  return NextResponse.json(result);
}

export const POST = withErrorBoundary(handlePOST);
