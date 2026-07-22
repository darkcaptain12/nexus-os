import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudCreateHandoff,
  cloudClaimHandoff,
  cloudHandoffs,
} from '@/lib/cloud/services/cloud-service';

const HANDOFF_KINDS = ['voice', 'agent', 'executive', 'workflow', 'commerce', 'trading'] as const;

const QuerySchema = z.object({
  state: z.enum(['pending', 'claimed', 'expired']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    kind: z.enum(HANDOFF_KINDS),
    fromDeviceId: z.string().min(1),
    context: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal('claim'),
    deviceId: z.string().min(1),
    kind: z.enum(HANDOFF_KINDS).optional(),
  }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ handoffs: cloudHandoffs(parsed.data.state, parsed.data.limit) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'create':
      return NextResponse.json({
        handoff: cloudCreateHandoff({
          kind: input.kind,
          fromDeviceId: input.fromDeviceId,
          context: input.context,
        }),
      });
    case 'claim': {
      const handoff = cloudClaimHandoff(input.deviceId, input.kind);
      if (!handoff)
        return NextResponse.json({ error: 'Devralınacak handoff yok' }, { status: 404 });
      return NextResponse.json({ handoff });
    }
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
