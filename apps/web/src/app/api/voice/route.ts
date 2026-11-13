import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceProcess } from '@/lib/voice/services/voice-ai-service';

// Ana konuşma turu — istemci STT transkriptini gönderir, APEX cevap + TTS döner.
// Ham audio istemci-tarafı çözülür (browser/native). requireWake=false follow-up'ta.
const VoiceSchema = z.object({
  transcript: z.string().min(1).max(2000),
  requireWake: z.boolean().default(true),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = VoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await voiceProcess(parsed.data);
  return NextResponse.json({ result });
}

export const POST = withErrorBoundary(handlePOST);
