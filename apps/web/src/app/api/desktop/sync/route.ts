import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/health';

interface SyncRecord {
  application: string;
  window_title?: string;
  activity_type: string;
  duration_seconds?: number;
  recorded_at: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
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
  const { data: { user } } = await supabase.auth.getUser();

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

  const { data, error } = await supabase
    .from('desktop_activity_logs')
    .insert(records)
    .select('id');

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
