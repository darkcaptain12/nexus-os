import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDesktopActiveProject } from '@/lib/desktop-vision/services/desktop-vision-service';

async function handleGET() {
  return NextResponse.json({ activeProject: getDesktopActiveProject() });
}

export const GET = withErrorBoundary(handleGET);
