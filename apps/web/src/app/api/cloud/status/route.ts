import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { cloudStatus, cloudWatchView } from '@/lib/cloud/services/cloud-service';
import type { NextRequest } from 'next/server';

async function handleGET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('view') === 'watch') {
    return NextResponse.json(await cloudWatchView());
  }
  return NextResponse.json(cloudStatus());
}

export const GET = withErrorBoundary(handleGET);
