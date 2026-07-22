import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { fetchDesktopAgent, type DesktopStatusResponse } from '@/lib/desktop-client';

async function handleGET() {
  const status = await fetchDesktopAgent<DesktopStatusResponse>('/api/desktop/status');
  if (!status) {
    return NextResponse.json(
      { connected: false, message: 'Desktop Agent bağlı değil' },
      { status: 503 },
    );
  }
  return NextResponse.json({ connected: true, ...status });
}

export const GET = withErrorBoundary(handleGET);
