import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { generateDailyBriefing } from '@/lib/ai/executive';

async function handleGET() {
  const briefing = await generateDailyBriefing({
    userId: 'system',
    name: 'Kullanıcı',
    email: '',
    timezone: 'Europe/Istanbul',
    locale: 'tr-TR',
  });

  return NextResponse.json(briefing);
}

export const GET = withErrorBoundary(handleGET);
