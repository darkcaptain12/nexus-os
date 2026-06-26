import { NextResponse } from 'next/server';
import { getAIExecutiveStatus } from '@/lib/ai/executive';

export async function GET() {
  const status = await getAIExecutiveStatus();
  return NextResponse.json(status);
}
