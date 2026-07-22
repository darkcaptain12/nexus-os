import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const supabase = await createClient();
  const repos = createRepositories(supabase);
  const graph = await repos.memories.getGraph(limit);

  return NextResponse.json(graph);
}

export const GET = withErrorBoundary(handleGET);
