import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  registerWebhook,
  receiveIncomingWebhook,
  getWebhooks,
  getDeliveries,
  retryFailedDeliveries,
} from '@/lib/plugins/webhooks';

const HOOK_EVENTS = [
  'task.created',
  'project.updated',
  'trade.opened',
  'trade.closed',
  'order.created',
  'product.published',
  'approval.required',
  'workflow.finished',
  'voice.intent',
  'desktop.activity',
] as const;

const RegisterSchema = z.object({
  action: z.literal('register'),
  pluginId: z.string().min(1),
  direction: z.enum(['incoming', 'outgoing']),
  url: z.string().url(),
  event: z.enum(HOOK_EVENTS),
  secret: z.string().min(8).max(200),
});
const IncomingSchema = z.object({
  action: z.literal('incoming'),
  webhookId: z.string().uuid(),
  payload: z.string(),
  signature: z.string(),
});
const RetrySchema = z.object({ action: z.literal('retry') });

async function handleGET() {
  return NextResponse.json({ webhooks: getWebhooks(), deliveries: getDeliveries() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const reg = RegisterSchema.safeParse(body);
  if (reg.success) {
    const { action, ...input } = reg.data;
    void action;
    return NextResponse.json({ webhook: registerWebhook(input) }, { status: 201 });
  }
  const inc = IncomingSchema.safeParse(body);
  if (inc.success) {
    const result = receiveIncomingWebhook(inc.data.webhookId, inc.data.payload, inc.data.signature);
    return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
  }
  const retry = RetrySchema.safeParse(body);
  if (retry.success) {
    return NextResponse.json({ retried: retryFailedDeliveries() });
  }
  return NextResponse.json(
    { error: 'action: register | incoming | retry gerekli' },
    { status: 400 },
  );
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
