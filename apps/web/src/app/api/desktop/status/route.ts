import { NextResponse } from 'next/server';
import { fetchDesktopAgent, type DesktopStatusResponse } from '@/lib/desktop-client';

export async function GET() {
  const status = await fetchDesktopAgent<DesktopStatusResponse>('/api/desktop/status');
  if (!status) {
    return NextResponse.json({ connected: false, message: 'Desktop Agent bağlı değil' }, { status: 503 });
  }
  return NextResponse.json({ connected: true, ...status });
}
