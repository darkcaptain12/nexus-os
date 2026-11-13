import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { fetchDesktopAgent } from '@/lib/desktop-client';

async function handleGET() {
  const data = await fetchDesktopAgent<Record<string, unknown>>('/api/desktop/browser');
  if (!data) return NextResponse.json({ connected: false }, { status: 503 });
  return NextResponse.json({ connected: true, ...data });
}

export const GET = withErrorBoundary(handleGET);
