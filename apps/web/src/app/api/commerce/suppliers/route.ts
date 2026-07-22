import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceQueue } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

// Kuyruktaki ürünlerin tedarikçi profilleri (Supplier Intelligence)
async function handleGET() {
  const queue = commerceQueue();
  const suppliers = queue
    .filter((q) => q.supplier !== null)
    .map((q) => ({ product: q.product.title, ...q.supplier! }));
  return NextResponse.json({ suppliers });
}

export const GET = withErrorBoundary(handleGET);
