import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  devPlugins,
  devEnable,
  devDisable,
  devReload,
  devGrant,
} from '@/lib/plugins/services/developer-platform-service';

const QuerySchema = z.object({
  state: z.enum(['installed', 'enabled', 'disabled', 'error', 'uninstalled']).optional(),
});
const PERMISSIONS = [
  'trading',
  'commerce',
  'desktop',
  'voice',
  'filesystem',
  'clipboard',
  'notifications',
  'workflow',
  'network',
] as const;
const ActionSchema = z.object({
  action: z.enum(['enable', 'disable', 'reload', 'grant']),
  pluginId: z.string().min(1),
  permissions: z.array(z.enum(PERMISSIONS)).optional(),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ plugins: devPlugins(parsed.data.state) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { action, pluginId, permissions } = parsed.data;

  switch (action) {
    case 'enable':
      return NextResponse.json({ plugin: devEnable(pluginId) });
    case 'disable':
      return NextResponse.json({ plugin: devDisable(pluginId) });
    case 'reload':
      return NextResponse.json({ plugin: devReload(pluginId) });
    case 'grant':
      return NextResponse.json({ result: devGrant(pluginId, permissions ?? []) });
  }
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
