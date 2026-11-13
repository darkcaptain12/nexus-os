import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKernel } from '@/lib/kernel';

async function handleGET() {
  const { kernel, ready } = getKernel();
  await ready;
  return NextResponse.json(kernel.getStatus());
}

export const GET = withErrorBoundary(handleGET);
