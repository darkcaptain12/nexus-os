import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  cloudCreateBackup,
  cloudBackups,
  cloudRestorePlan,
} from '@/lib/cloud/services/cloud-service';

const BACKUP_DOMAINS = ['memory', 'knowledge', 'tasks', 'projects', 'plugins', 'settings'] as const;

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(20).optional(),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    deviceId: z.string().min(1),
    domains: z.array(z.enum(BACKUP_DOMAINS)).optional(),
  }),
  z.object({ action: z.literal('restore'), version: z.number().int().min(1) }),
]);

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ backups: cloudBackups(parsed.data.limit) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  switch (input.action) {
    case 'create':
      return NextResponse.json({
        backup: cloudCreateBackup(input.deviceId, input.domains ? [...input.domains] : undefined),
      });
    case 'restore': {
      const plan = cloudRestorePlan(input.version);
      if (!plan) return NextResponse.json({ error: 'Yedek versiyonu bulunamadı' }, { status: 404 });
      return NextResponse.json({ plan });
    }
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
