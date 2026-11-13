import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDesktopWindowContext } from '@/lib/desktop-vision/services/desktop-vision-service';

async function handleGET() {
  const window = getDesktopWindowContext();
  if (!window) {
    return NextResponse.json({ window: null, message: 'Aktif pencere bağlamı henüz yok' });
  }
  return NextResponse.json({ window });
}

export const GET = withErrorBoundary(handleGET);
