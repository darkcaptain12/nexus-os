import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

async function handleGET() {
  const supabase = await createClient();
  const repos = createRepositories(supabase);
  const duplicates = await repos.memories.findDuplicates();

  return NextResponse.json({
    pairs: duplicates.pairs.length,
    duplicates: duplicates.pairs.slice(0, 10),
  });
}

export const GET = withErrorBoundary(handleGET);
