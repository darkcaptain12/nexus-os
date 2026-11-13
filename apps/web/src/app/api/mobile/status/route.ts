import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { mobileSystemHealth } from '@/lib/mobile/services/mobile-service';

// System Dashboard: Mobile Health — cihazlar, batarya, push, offline/sync kuyruk, watch
async function handleGET() {
  return NextResponse.json({ health: mobileSystemHealth() });
}

export const GET = withErrorBoundary(handleGET);
