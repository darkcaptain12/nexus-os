import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getProjectMemory } from '@/lib/memory';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('id');
  const projectName = searchParams.get('name') ?? 'default';

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  const memory = getProjectMemory(projectId, projectName);
  return NextResponse.json(memory);
}

export const GET = withErrorBoundary(handleGET);
