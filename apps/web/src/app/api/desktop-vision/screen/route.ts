import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { processScreen } from '@/lib/desktop-vision/services/desktop-vision-service';

// Screen Understanding — app + pencere başlığı + opsiyonel OCR metninden
// ilişki zinciri (app→dosya→proje→görev→müşteri) çıkarır, Knowledge Graph'a yazar.
const ScreenSchema = z.object({
  app: z.string().min(1).max(200),
  windowTitle: z.string().max(1000),
  ocrText: z.string().max(200_000).optional(),
  projectHint: z.string().max(200).optional(),
  customerHint: z.string().max(200).optional(),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ScreenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { screen, window } = processScreen(parsed.data);
  return NextResponse.json({ screen, window }, { status: 201 });
}

export const POST = withErrorBoundary(handlePOST);
