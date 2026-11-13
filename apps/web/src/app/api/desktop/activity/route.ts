import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { fetchDesktopAgent, type ActivityResponse } from '@/lib/desktop-client';

async function handleGET() {
  const data = await fetchDesktopAgent<ActivityResponse>('/api/desktop/activity');
  if (!data) {
    return NextResponse.json({ connected: false }, { status: 503 });
  }
  return NextResponse.json({ connected: true, ...data });
}

export const GET = withErrorBoundary(handleGET);
