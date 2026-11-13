import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudRegisterDevice,
  cloudPairDevice,
  cloudVerifyDevice,
  cloudRenameDevice,
  cloudDisableDevice,
  cloudEnableDevice,
  cloudRemoveDevice,
  cloudDevices,
  cloudDeviceHealth,
  cloudDeviceHeartbeat,
} from '@/lib/cloud/services/cloud-service';

const DEVICE_TYPES = [
  'mac',
  'windows',
  'iphone',
  'ipad',
  'apple-watch',
  'android',
  'wear-os',
  'web',
] as const;
const NETWORKS = ['wifi', 'cellular', 'ethernet', 'offline'] as const;

const QuerySchema = z.object({
  state: z.enum(['pending', 'active', 'disabled', 'revoked']).optional(),
  health: z.string().optional(), // deviceId — sağlık sorgusu
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('register'),
    name: z.string().min(1).max(100),
    type: z.enum(DEVICE_TYPES),
    platform: z.string().min(1).max(60),
    version: z.string().min(1).max(30),
    capabilities: z.array(z.string()).max(20).optional(),
    battery: z.number().min(0).max(100).optional(),
    network: z.enum(NETWORKS).optional(),
    pushToken: z.string().max(300).optional(),
    deviceId: z.string().optional(),
  }),
  z.object({ action: z.literal('pair'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('verify'), code: z.string().length(6) }),
  z.object({
    action: z.literal('rename'),
    deviceId: z.string().min(1),
    name: z.string().min(1).max(100),
  }),
  z.object({ action: z.literal('disable'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('enable'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('remove'), deviceId: z.string().min(1) }),
  z.object({
    action: z.literal('heartbeat'),
    deviceId: z.string().min(1),
    battery: z.number().min(0).max(100).optional(),
    network: z.enum(NETWORKS).optional(),
  }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.health) {
    const health = cloudDeviceHealth(parsed.data.health);
    if (!health) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
    return NextResponse.json(health);
  }
  return NextResponse.json({ devices: cloudDevices(parsed.data.state) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'register':
      return NextResponse.json({
        device: cloudRegisterDevice({
          name: input.name,
          type: input.type,
          platform: input.platform,
          version: input.version,
          capabilities: input.capabilities,
          battery: input.battery,
          network: input.network,
          pushToken: input.pushToken,
          deviceId: input.deviceId,
        }),
      });
    case 'pair': {
      const pairing = cloudPairDevice(input.deviceId);
      if (!pairing)
        return NextResponse.json({ error: 'Cihaz bulunamadı veya revoked' }, { status: 404 });
      return NextResponse.json({ pairing });
    }
    case 'verify': {
      const device = cloudVerifyDevice(input.code);
      if (!device)
        return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş kod' }, { status: 400 });
      return NextResponse.json({ device });
    }
    case 'rename': {
      const device = cloudRenameDevice(input.deviceId, input.name);
      if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
      return NextResponse.json({ device });
    }
    case 'disable': {
      const device = cloudDisableDevice(input.deviceId);
      if (!device)
        return NextResponse.json({ error: 'Cihaz bulunamadı veya revoked' }, { status: 404 });
      return NextResponse.json({ device });
    }
    case 'enable': {
      const device = cloudEnableDevice(input.deviceId);
      if (!device)
        return NextResponse.json({ error: 'Cihaz bulunamadı veya revoked' }, { status: 404 });
      return NextResponse.json({ device });
    }
    case 'remove':
      return NextResponse.json({ removed: cloudRemoveDevice(input.deviceId) });
    case 'heartbeat': {
      const device = cloudDeviceHeartbeat(input.deviceId, {
        battery: input.battery,
        network: input.network,
      });
      if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
      return NextResponse.json({ device });
    }
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
