import { NextResponse } from 'next/server';
import { fetchDesktopAgent, type ProductivityResponse } from '@/lib/desktop-client';

export async function GET() {
  const data = await fetchDesktopAgent<ProductivityResponse>('/api/desktop/productivity');
  if (!data) {
    return NextResponse.json({ connected: false }, { status: 503 });
  }
  return NextResponse.json({ connected: true, ...data });
}
