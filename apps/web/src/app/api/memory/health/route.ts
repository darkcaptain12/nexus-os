import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { withCache } from '@/lib/cache';

async function handleGET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const repos = createRepositories(supabase);

  const health = await withCache(`memory.health:${user?.id ?? 'anonymous'}`, 60000, () =>
    repos.memories.getHealth(),
  );

  return NextResponse.json(health);
}

export const GET = withErrorBoundary(handleGET);
