import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { mobileWidget } from '@/lib/mobile/services/mobile-service';

const QuerySchema = z.object({
  size: z.enum(['small', 'medium', 'large', 'lock-screen', 'material']).default('medium'),
  platform: z.enum(['ios', 'ipad', 'android', 'apple-watch', 'wear-os']).default('ios'),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const widget = await mobileWidget(parsed.data.size, parsed.data.platform);
  return NextResponse.json({ widget });
}

export const GET = withErrorBoundary(handleGET);
