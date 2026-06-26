import { NextResponse } from 'next/server';
import { generateDailyBriefing } from '@/lib/ai/executive';

export async function GET() {
  const briefing = await generateDailyBriefing({
    userId: 'system',
    name: 'Kullanıcı',
    email: '',
    timezone: 'Europe/Istanbul',
    locale: 'tr-TR',
  });

  return NextResponse.json(briefing);
}
