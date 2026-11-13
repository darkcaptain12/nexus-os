import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceStatus } from '@/lib/voice/services/voice-ai-service';

async function handleGET() {
  return NextResponse.json({ status: voiceStatus() });
}

export const GET = withErrorBoundary(handleGET);
