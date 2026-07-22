import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  learningReport,
  lessons,
} from '@/lib/executive/optimization/services/self-optimization-service';

const QuerySchema = z.object({
  domain: z.enum(['workflow', 'trade', 'ad', 'agent', 'decision']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  view: z.enum(['report', 'lessons']).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'lessons')
    return NextResponse.json({ lessons: lessons(parsed.data.domain, parsed.data.limit) });
  return NextResponse.json({ report: learningReport() });
}

export const GET = withErrorBoundary(handleGET);
