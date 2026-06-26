import { NextResponse } from 'next/server';
import { fetchDesktopAgent, type AppsResponse } from '@/lib/desktop-client';

export async function GET() {
  const data = await fetchDesktopAgent<AppsResponse>('/api/desktop/apps');
  if (!data) {
    return NextResponse.json({ connected: false }, { status: 503 });
  }
  return NextResponse.json({ connected: true, ...data });
}
