import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { processVoiceCommand } from '@/lib/quant/services/voice-service';

// APEX Voice kapısı — mobil/watch istemcileri STT çıktısını buraya gönderir.
const VoiceSchema = z.object({
  text: z.string().min(1).max(500),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = VoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const response = await processVoiceCommand(parsed.data.text);
  return NextResponse.json({ response });
}

export const POST = withErrorBoundary(handlePOST);
