import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memoryId = searchParams.get('id');

  if (!memoryId) {
    return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
  }

  const supabase = await createClient();
  const repos = createRepositories(supabase);
  const related = await repos.memories.findRelated(memoryId);

  return NextResponse.json(related);
}

export const GET = withErrorBoundary(handleGET);
