import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/health';
import { recordDesktopActivity } from '@/lib/knowledge/auto-linker';

interface SyncRecord {
  application: string;
  window_title?: string;
  activity_type: string;
  duration_seconds?: number;
  recorded_at: string;
  metadata?: Record<string, unknown>;
}

async function handlePOST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { records: SyncRecord[]; idempotencyKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
    return NextResponse.json({ error: 'Records array required' }, { status: 400 });
  }

  if (body.records.length > 100) {
    return NextResponse.json({ error: 'Max 100 records per batch' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const records = body.records.map((r) => ({
    user_id: user.id,
    application: r.application,
    window_title: r.window_title ?? null,
    activity_type: r.activity_type,
    duration_seconds: r.duration_seconds ?? null,
    recorded_at: r.recorded_at,
    metadata: r.metadata ?? {},
  }));

  // Knowledge Graph: dosya→uygulama→website→proje ilişkileri
  for (const r of body.records) {
    recordDesktopActivity({
      app: r.application,
      windowTitle: r.window_title,
      filePath: r.metadata?.['filePath'] as string | undefined,
      url: r.metadata?.['url'] as string | undefined,
      projectHint: r.metadata?.['project'] as string | undefined,
    });
  }

  const { data, error } = await supabase.from('desktop_activity_logs').insert(records).select('id');

  if (error) {
    return NextResponse.json(
      { error: 'Failed to store records', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    synced: data?.length ?? 0,
    total: records.length,
    timestamp: new Date().toISOString(),
  });
}

export const POST = withErrorBoundary(handlePOST);
