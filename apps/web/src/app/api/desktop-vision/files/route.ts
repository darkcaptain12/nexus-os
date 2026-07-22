import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { processFile } from '@/lib/desktop-vision/services/desktop-vision-service';
import { getRecentFileInsights } from '@/lib/desktop-vision/file-insight-service';

// Dosya içeriği (binary→text çıkarımı istemci-tarafı) işlenir: entity çıkarımı →
// Knowledge Graph → Memory → Executive Context.
const FileSchema = z.object({
  fileName: z.string().min(1).max(500),
  text: z.string().max(500_000),
  mimeType: z.string().max(200).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

async function handleGET() {
  return NextResponse.json({ insights: getRecentFileInsights(20) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = FileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const insight = processFile(parsed.data);
  return NextResponse.json({ insight }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
