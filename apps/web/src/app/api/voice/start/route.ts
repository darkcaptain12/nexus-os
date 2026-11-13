import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceStart, setMicPermission } from '@/lib/voice/services/voice-ai-service';

const StartSchema = z.object({
  language: z.enum(['tr', 'en']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  micPermission: z.enum(['granted', 'denied', 'prompt', 'unknown']).optional(),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = StartSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.micPermission) setMicPermission(parsed.data.micPermission);
  const session = voiceStart(parsed.data.language, parsed.data.gender);
  return NextResponse.json({ session }, { status: 201 });
}

export const POST = withErrorBoundary(handlePOST);
