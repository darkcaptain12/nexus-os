import { NextResponse } from 'next/server';
import { fetchDesktopAgent, type ActivityResponse } from '@/lib/desktop-client';

export async function GET() {
  const data = await fetchDesktopAgent<ActivityResponse>('/api/desktop/activity');
  if (!data) {
    return NextResponse.json({ connected: false }, { status: 503 });
  }
  return NextResponse.json({ connected: true, ...data });
}
