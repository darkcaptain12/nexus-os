import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { mobileWatch } from '@/lib/mobile/services/mobile-service';

// Apple Watch / Wear OS — Executive/Trading/Approval/Tasks/Voice/Notifications
async function handleGET() {
  return NextResponse.json({ watch: await mobileWatch() });
}

export const GET = withErrorBoundary(handleGET);
