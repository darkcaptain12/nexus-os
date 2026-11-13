import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { processClipboard } from '@/lib/desktop-vision/services/desktop-vision-service';
import { getClipboardHistory, getClipboardStats } from '@/lib/desktop-vision/clipboard-service';

const ClipboardSchema = z.object({
  content: z.string().max(50_000),
  sourceApp: z.string().max(200).optional(),
});

async function handleGET() {
  return NextResponse.json({
    history: getClipboardHistory(30),
    stats: getClipboardStats(),
  });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ClipboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = processClipboard(parsed.data.content, parsed.data.sourceApp);
  return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
