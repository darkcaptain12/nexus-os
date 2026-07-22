import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  mobileRegisterDevice,
  mobileHeartbeat,
  mobileDevices,
} from '@/lib/mobile/services/mobile-service';

const RegisterSchema = z.object({
  platform: z.enum(['ios', 'ipad', 'android', 'apple-watch', 'wear-os']),
  name: z.string().min(1).max(100),
  pushToken: z.string().max(500).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  appVersion: z.string().max(20).optional(),
  deviceId: z.string().uuid().optional(),
});

const HeartbeatSchema = z.object({
  action: z.literal('heartbeat'),
  deviceId: z.string().uuid(),
  batteryLevel: z.number().min(0).max(100).optional(),
});

async function handleGET() {
  return NextResponse.json({ devices: mobileDevices() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const hb = HeartbeatSchema.safeParse(body);
  if (hb.success) {
    const device = mobileHeartbeat(hb.data.deviceId, hb.data.batteryLevel);
    if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
    return NextResponse.json({ device });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const device = mobileRegisterDevice(parsed.data);
  return NextResponse.json({ device }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
