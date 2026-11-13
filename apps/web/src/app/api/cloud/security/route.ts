import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudTrustDevice,
  cloudRevokeDevice,
  cloudCreateSession,
  cloudRevokeSession,
  cloudRemoteLogout,
  cloudRotatePushToken,
  cloudRotateEncryptionKey,
  cloudSessions,
  cloudSecurityEvents,
} from '@/lib/cloud/services/cloud-service';

const QuerySchema = z.object({
  deviceId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  view: z.enum(['events', 'sessions']).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('trust'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('revoke'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('create-session'), deviceId: z.string().min(1) }),
  z.object({ action: z.literal('revoke-session'), sessionId: z.string().min(1) }),
  z.object({ action: z.literal('remote-logout'), deviceId: z.string().min(1) }),
  z.object({
    action: z.literal('rotate-token'),
    deviceId: z.string().min(1),
    pushToken: z.string().min(8).max(300),
  }),
  z.object({ action: z.literal('rotate-encryption'), deviceId: z.string().min(1) }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.view === 'sessions')
    return NextResponse.json({ sessions: cloudSessions(parsed.data.deviceId) });
  return NextResponse.json({
    events: cloudSecurityEvents(parsed.data.limit, parsed.data.deviceId),
  });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'trust': {
      const device = cloudTrustDevice(input.deviceId);
      if (!device)
        return NextResponse.json(
          { error: 'Cihaz doğrulanmamış veya revoked — trust verilemez' },
          { status: 400 },
        );
      return NextResponse.json({ device });
    }
    case 'revoke': {
      const device = cloudRevokeDevice(input.deviceId);
      if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
      return NextResponse.json({ device });
    }
    case 'create-session':
      return NextResponse.json({ session: cloudCreateSession(input.deviceId) });
    case 'revoke-session': {
      const ok = cloudRevokeSession(input.sessionId);
      if (!ok)
        return NextResponse.json({ error: 'Oturum bulunamadı veya zaten iptal' }, { status: 404 });
      return NextResponse.json({ revoked: true });
    }
    case 'remote-logout':
      return NextResponse.json({ revokedSessions: cloudRemoteLogout(input.deviceId) });
    case 'rotate-token': {
      const device = cloudRotatePushToken(input.deviceId, input.pushToken);
      if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
      return NextResponse.json({ device });
    }
    case 'rotate-encryption': {
      const device = cloudRotateEncryptionKey(input.deviceId);
      if (!device) return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 });
      return NextResponse.json({ device });
    }
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
