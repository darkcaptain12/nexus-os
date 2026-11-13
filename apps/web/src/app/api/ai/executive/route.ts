import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getExecutiveSummary } from '@/lib/ai/executive';
import { createClient } from '@/lib/supabase/server';
import { withCache } from '@/lib/cache';

async function handleGET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const summary = await withCache(
    `ai.executive:${user?.id ?? 'anonymous'}`,
    30000,
    getExecutiveSummary,
  );
  return NextResponse.json(summary);
}

export const GET = withErrorBoundary(handleGET);
