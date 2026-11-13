import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDesktopIntelligenceContext } from '@/lib/desktop-vision/services/desktop-vision-service';

// Desktop Context — Context Builder v3 girdisi (mobil sözleşme: düz JSON)
async function handleGET() {
  return NextResponse.json({ context: getDesktopIntelligenceContext() });
}

export const GET = withErrorBoundary(handleGET);
