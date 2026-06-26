import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSupabaseHealth, validateEnvironment, isSupabaseConfigured } from '@/lib/supabase/health';

export async function GET() {
  const envCheck = validateEnvironment();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      environment: envCheck,
      health: null,
      message: 'Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
    }, { status: 503 });
  }

  const supabase = await createClient();
  const health = await checkSupabaseHealth(supabase);

  const status = health.connected && health.errors.length === 0 ? 200 : 503;

  return NextResponse.json({
    configured: true,
    environment: envCheck,
    health,
  }, { status });
}
