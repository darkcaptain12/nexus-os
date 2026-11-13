import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { closePosition } from '@/lib/quant/position-manager';

async function handlePOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closed = await closePosition(id);
  if (!closed) {
    return NextResponse.json({ error: 'Pozisyon bulunamadı' }, { status: 404 });
  }
  return NextResponse.json({ position: closed });
}

export const POST = withErrorBoundary(handlePOST);
