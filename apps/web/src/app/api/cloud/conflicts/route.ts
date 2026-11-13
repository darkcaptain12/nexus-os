import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { cloudConflicts, cloudResolveConflict } from '@/lib/cloud/services/cloud-service';

const QuerySchema = z.object({
  status: z.enum(['auto-resolved', 'manual-review', 'resolved']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const ActionSchema = z.object({
  action: z.literal('resolve'),
  conflictId: z.string().min(1),
  choice: z.enum(['local', 'remote']),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ conflicts: cloudConflicts(parsed.data.status, parsed.data.limit) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const conflict = cloudResolveConflict(parsed.data.conflictId, parsed.data.choice);
  if (!conflict)
    return NextResponse.json(
      { error: 'Conflict bulunamadı veya manuel beklemede değil' },
      { status: 404 },
    );
  return NextResponse.json({ conflict });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
