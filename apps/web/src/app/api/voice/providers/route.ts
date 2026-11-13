import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceProviders } from '@/lib/voice/services/voice-ai-service';

async function handleGET() {
  return NextResponse.json({ providers: voiceProviders() });
}

export const GET = withErrorBoundary(handleGET);
