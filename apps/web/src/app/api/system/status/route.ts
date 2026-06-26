import { NextResponse } from 'next/server';
import { getKernel } from '@/lib/kernel';

export async function GET() {
  const { kernel, ready } = getKernel();
  await ready;
  return NextResponse.json(kernel.getStatus());
}
