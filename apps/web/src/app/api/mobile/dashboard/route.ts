import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  mobileHome,
  mobileApprovals,
  mobileTrading,
  mobileCommerce,
  mobileDesktopCompanion,
  mobileOfflineSnapshot,
} from '@/lib/mobile/services/mobile-service';

const QuerySchema = z.object({
  view: z.enum(['home', 'approvals', 'trading', 'commerce', 'desktop', 'offline']).default('home'),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  switch (parsed.data.view) {
    case 'approvals':
      return NextResponse.json({ approvals: mobileApprovals() });
    case 'trading':
      return NextResponse.json({ trading: await mobileTrading() });
    case 'commerce':
      return NextResponse.json({ commerce: await mobileCommerce() });
    case 'desktop':
      return NextResponse.json({ desktop: mobileDesktopCompanion() });
    case 'offline':
      return NextResponse.json({ snapshot: mobileOfflineSnapshot() });
    default:
      return NextResponse.json({ dashboard: await mobileHome() });
  }
}

export const GET = withErrorBoundary(handleGET);
