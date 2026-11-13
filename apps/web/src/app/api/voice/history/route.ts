import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceHistory } from '@/lib/voice/services/voice-ai-service';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ sessions: voiceHistory(parsed.data.limit) });
}

export const GET = withErrorBoundary(handleGET);
