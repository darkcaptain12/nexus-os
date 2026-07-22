import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getProductivityData } from '@/lib/ai/executive';
import { createClient } from '@/lib/supabase/server';
import { withCache } from '@/lib/cache';

async function handleGET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const productivity = await withCache(
    `ai.productivity:${user?.id ?? 'anonymous'}`,
    30000,
    getProductivityData,
  );
  return NextResponse.json(productivity);
}

export const GET = withErrorBoundary(handleGET);
