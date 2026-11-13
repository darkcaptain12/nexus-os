import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  commerceDiscover,
  commerceHunt,
  commerceLoadCsv,
  commerceProviders,
} from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

const HuntSchema = z.object({
  action: z.literal('hunt'),
  keyword: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  count: z.number().int().min(1).max(50).default(20),
});

const CsvSchema = z.object({
  action: z.literal('load-csv'),
  csv: z.string().min(10).max(500_000),
});

const DiscoverSchema = z.object({
  keyword: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

async function handleGET() {
  return NextResponse.json({ providers: commerceProviders() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const hunt = HuntSchema.safeParse(body);
  if (hunt.success) {
    const result = await commerceHunt(hunt.data);
    return NextResponse.json({ result });
  }

  const csv = CsvSchema.safeParse(body);
  if (csv.success) {
    const count = commerceLoadCsv(csv.data.csv);
    return NextResponse.json({ loaded: count });
  }

  const parsed = DiscoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const products = await commerceDiscover(parsed.data);
  return NextResponse.json({ products });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
