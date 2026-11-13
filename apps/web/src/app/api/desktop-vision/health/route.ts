import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDesktopVisionHealth } from '@/lib/desktop-vision/services/desktop-vision-service';

async function handleGET() {
  return NextResponse.json({ health: getDesktopVisionHealth() });
}

export const GET = withErrorBoundary(handleGET);
