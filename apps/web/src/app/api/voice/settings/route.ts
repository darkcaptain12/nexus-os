import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceSettings, voiceUpdateSettings } from '@/lib/voice/services/voice-ai-service';

const SettingsSchema = z.object({
  language: z.enum(['tr', 'en']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  sttProvider: z.string().max(50).optional(),
  ttsProvider: z.string().max(50).optional(),
  wakeWordEnabled: z.boolean().optional(),
  followUpTimeoutSeconds: z.number().int().min(5).max(300).optional(),
  wakeConfidenceThreshold: z.number().min(0).max(1).optional(),
});

async function handleGET() {
  return NextResponse.json({ settings: voiceSettings() });
}

async function handlePATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ settings: voiceUpdateSettings(parsed.data) });
}

export const GET = withErrorBoundary(handleGET);
export const PATCH = withErrorBoundary(handlePATCH);
