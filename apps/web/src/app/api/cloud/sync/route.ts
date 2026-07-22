import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudSync,
  cloudPushDelta,
  cloudPullDeltas,
  cloudDeltaLog,
  cloudEnqueueOffline,
  cloudOfflineQueue,
} from '@/lib/cloud/services/cloud-service';

const SYNC_DOMAINS = [
  'tasks',
  'projects',
  'memory',
  'knowledge',
  'commerce',
  'trading',
  'executive',
  'agents',
  'notifications',
  'plugins',
  'settings',
] as const;

const QuerySchema = z.object({
  domain: z.enum(SYNC_DOMAINS).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  queue: z.enum(['offline']).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('run'), deviceId: z.string().min(1) }),
  z.object({
    action: z.literal('push'),
    deviceId: z.string().min(1),
    domain: z.enum(SYNC_DOMAINS),
    key: z.string().min(1),
    operation: z.enum(['create', 'update', 'delete']),
    payload: z.record(z.string(), z.unknown()),
    baseVersion: z.number().int().min(0).optional(),
  }),
  z.object({
    action: z.literal('pull'),
    deviceId: z.string().min(1),
    domains: z.array(z.enum(SYNC_DOMAINS)).optional(),
  }),
  z.object({
    action: z.literal('enqueue'),
    deviceId: z.string().min(1),
    domain: z.enum(SYNC_DOMAINS),
    key: z.string().min(1),
    operation: z.enum(['create', 'update', 'delete']),
    payload: z.record(z.string(), z.unknown()),
  }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.queue === 'offline') return NextResponse.json({ queue: cloudOfflineQueue() });
  return NextResponse.json({ deltas: cloudDeltaLog(parsed.data.limit, parsed.data.domain) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'run':
      return NextResponse.json({ result: cloudSync(input.deviceId) });
    case 'push':
      return NextResponse.json({
        result: cloudPushDelta({
          deviceId: input.deviceId,
          domain: input.domain,
          key: input.key,
          operation: input.operation,
          payload: input.payload,
          baseVersion: input.baseVersion,
        }),
      });
    case 'pull':
      return NextResponse.json(cloudPullDeltas(input.deviceId, input.domains));
    case 'enqueue':
      return NextResponse.json({
        result: cloudEnqueueOffline({
          deviceId: input.deviceId,
          domain: input.domain,
          key: input.key,
          operation: input.operation,
          payload: input.payload,
        }),
      });
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
