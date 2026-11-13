import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getAuthCapabilities } from '@/lib/mobile/services/mobile-service';

// Mobile kök — auth yetenekleri + platform sözleşmesi (framework-bağımsız)
async function handleGET() {
  return NextResponse.json({
    platform: 'apex-mobile-v1',
    auth: getAuthCapabilities(),
    supportedDevices: ['ios', 'ipad', 'android', 'apple-watch', 'wear-os'],
  });
}

export const GET = withErrorBoundary(handleGET);
