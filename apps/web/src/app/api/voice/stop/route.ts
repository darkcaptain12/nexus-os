import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { voiceStop } from '@/lib/voice/services/voice-ai-service';

async function handlePOST() {
  const session = voiceStop();
  return NextResponse.json({ stopped: session !== null, session });
}

export const POST = withErrorBoundary(handlePOST);
