import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { processOcr } from '@/lib/desktop-vision/services/desktop-vision-service';
import { getRecentOcrResults } from '@/lib/desktop-vision/ocr-service';

// OCR sonucu istemci native OCR'dan (macOS Vision / mobil ML Kit) gelir; servis
// normalize eder, sınıflandırır, Knowledge Graph'a yazar. Sürekli çalışmaz —
// yalnız ekran değişince (force=false → hash dedup) veya istek üzerine (force=true).
const OcrSchema = z.object({
  text: z.string().max(200_000).optional(),
  imageRef: z.string().max(2000).optional(),
  language: z.enum(['tr', 'en', 'auto']).default('auto'),
  sourceApp: z.string().max(200).optional(),
  windowTitle: z.string().max(500).optional(),
  force: z.boolean().default(false),
});

async function handleGET() {
  return NextResponse.json({ results: getRecentOcrResults(20) });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = OcrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { force, ...request } = parsed.data;
  const result = await processOcr(request, force);
  if (!result) {
    return NextResponse.json({
      skipped: true,
      reason: 'Ekran değişmedi — OCR atlandı (CPU tasarrufu)',
    });
  }
  return NextResponse.json({ result }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
