import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceCurrentConversation, voiceInterrupt } from '@/lib/voice/services/voice-ai-service';

const ActionSchema = z.object({ action: z.literal('interrupt') });

async function handleGET() {
  return NextResponse.json({ conversation: voiceCurrentConversation() });
}

// "dur" — konuşmayı kes (interrupt)
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const session = voiceInterrupt();
  return NextResponse.json({ interrupted: session !== null, session });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
