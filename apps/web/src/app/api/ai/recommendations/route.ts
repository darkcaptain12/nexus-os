import { NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/ai/executive';

export async function GET() {
  const recommendations = await getRecommendations();
  return NextResponse.json({ recommendations, count: recommendations.length });
}
