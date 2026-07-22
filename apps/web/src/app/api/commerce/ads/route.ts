import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getActionEngine } from '@/lib/actions/engine-instance';
import {
  commerceAdMetrics,
  commerceRecordAdMetrics,
} from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

const LaunchSchema = z.object({
  action: z.literal('launch'),
  queueId: z.string().uuid(),
  platform: z.enum(['meta', 'google', 'tiktok']),
  dailyBudget: z.number().positive().max(10000).default(10),
});

const MetricsSchema = z.object({
  action: z.literal('metrics'),
  campaignId: z.string().min(1),
  platform: z.enum(['meta', 'google', 'tiktok']),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  spend: z.number().nonnegative(),
  conversions: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
});

async function handleGET() {
  return NextResponse.json({ metrics: commerceAdMetrics() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const metrics = MetricsSchema.safeParse(body);
  if (metrics.success) {
    const { action, ...input } = metrics.data;
    void action;
    return NextResponse.json(commerceRecordAdMetrics(input));
  }

  const launch = LaunchSchema.safeParse(body);
  if (!launch.success) {
    return NextResponse.json({ error: launch.error.flatten() }, { status: 400 });
  }
  // Reklam başlatma — critical risk, Approval Queue'dan geçer
  const execution = await getActionEngine().submit({
    actionId: 'commerce.launchAd',
    params: {
      queueId: launch.data.queueId,
      platform: launch.data.platform,
      dailyBudget: launch.data.dailyBudget,
    },
    requestedBy: 'commerce-api',
    source: 'ai',
    priority: 1,
  });
  return NextResponse.json(
    { execution, requiresApproval: execution.status === 'pending-approval' },
    { status: 202 },
  );
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
