import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudReportPresence,
  cloudPresence,
  cloudReportVitals,
  cloudVitals,
} from '@/lib/cloud/services/cloud-service';

const QuerySchema = z.object({
  deviceId: z.string().optional(),
  vitals: z.enum(['true']).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('report'),
    deviceId: z.string().min(1),
    status: z.enum(['online', 'offline', 'idle', 'busy', 'sleeping']),
  }),
  z.object({
    action: z.literal('vitals'),
    deviceId: z.string().min(1),
    cpuPercent: z.number().min(0).max(100),
    ramPercent: z.number().min(0).max(100),
    storagePercent: z.number().min(0).max(100),
    network: z.enum(['wifi', 'cellular', 'ethernet', 'offline']),
    battery: z.number().min(0).max(100).optional(),
  }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.vitals === 'true')
    return NextResponse.json({ vitals: cloudVitals(parsed.data.deviceId) });
  return NextResponse.json({ presence: cloudPresence(parsed.data.deviceId) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'report':
      return NextResponse.json({ presence: cloudReportPresence(input.deviceId, input.status) });
    case 'vitals':
      return NextResponse.json({
        vitals: cloudReportVitals({
          deviceId: input.deviceId,
          cpuPercent: input.cpuPercent,
          ramPercent: input.ramPercent,
          storagePercent: input.storagePercent,
          network: input.network,
          battery: input.battery,
        }),
      });
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
