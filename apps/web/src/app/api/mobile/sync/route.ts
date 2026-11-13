import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  mobileSync,
  mobileEnqueueMutation,
  mobileBackgroundSync,
} from '@/lib/mobile/services/mobile-service';

const SyncSchema = z.object({
  strategy: z.enum(['server-wins', 'client-wins', 'last-write-wins']).default('last-write-wins'),
});

const MutationSchema = z.object({
  action: z.literal('enqueue'),
  entity: z.enum(['executive', 'tasks', 'projects', 'trading', 'commerce', 'memory']),
  mutation: z.string().min(1).max(50),
  payload: z.record(z.string(), z.unknown()).default({}),
  deviceId: z.string().uuid(),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const mut = MutationSchema.safeParse(body);
  if (mut.success) {
    const mutation = mobileEnqueueMutation({
      entity: mut.data.entity,
      action: mut.data.mutation,
      payload: mut.data.payload,
      deviceId: mut.data.deviceId,
    });
    return NextResponse.json({ queued: mutation }, { status: 201 });
  }

  const parsed = SyncSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = mobileSync(parsed.data.strategy);
  return NextResponse.json({ result });
}

// Background sync tetiği (istemci BackgroundTasks/WorkManager schedule eder)
async function handlePUT() {
  const result = await mobileBackgroundSync();
  return NextResponse.json({ result });
}

export const POST = withErrorBoundary(handlePOST);
export const PUT = withErrorBoundary(handlePUT);
