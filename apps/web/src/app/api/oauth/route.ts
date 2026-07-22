import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { registerOAuthApp, getOAuthApp, generatePkceChallenge } from '@/lib/plugins/plugin-oauth';

// Plugin OAuth Apps — mevcut integrations/oauth reuse (OAuth2/OpenID/PKCE)
const RegisterSchema = z.object({
  action: z.literal('register'),
  pluginId: z.string().min(1),
  redirectUri: z.string().url(),
  scopes: z.array(z.string()).default([]),
  pkceRequired: z.boolean().default(true),
  openIdEnabled: z.boolean().default(false),
});
const PkceSchema = z.object({
  action: z.literal('pkce'),
  verifier: z.string().min(43).max(128),
});

async function handleGET(req: NextRequest) {
  const pluginId = req.nextUrl.searchParams.get('pluginId');
  if (!pluginId) return NextResponse.json({ error: 'pluginId gerekli' }, { status: 400 });
  const app = getOAuthApp(pluginId);
  if (!app) return NextResponse.json({ error: 'OAuth app bulunamadı' }, { status: 404 });
  return NextResponse.json({ app });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const pkce = PkceSchema.safeParse(body);
  if (pkce.success) {
    return NextResponse.json({ pkce: generatePkceChallenge(pkce.data.verifier) });
  }
  const reg = RegisterSchema.safeParse(body);
  if (!reg.success) return NextResponse.json({ error: reg.error.flatten() }, { status: 400 });
  const { action, ...input } = reg.data;
  void action;
  return NextResponse.json({ app: registerOAuthApp(input) }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
