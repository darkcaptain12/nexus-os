import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { mobilePush, mobileNotifications } from '@/lib/mobile/services/mobile-service';

const CATEGORIES = [
  'trading',
  'commerce',
  'agent',
  'desktop',
  'memory',
  'workflow',
  'approval',
  'risk',
] as const;

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  category: z.enum(CATEGORIES).optional(),
});

const PushSchema = z.object({
  category: z.enum(CATEGORIES),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  deepLink: z.string().max(300).optional(),
  requiresApproval: z.boolean().default(false),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({
    notifications: mobileNotifications(parsed.data.limit, parsed.data.category),
  });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const notification = mobilePush(parsed.data);
  return NextResponse.json({ notification }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
