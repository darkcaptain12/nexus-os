import { NextResponse } from 'next/server';
import { getKernel } from '@/lib/kernel';

export async function GET() {
  const { kernel, ready } = getKernel();
  await ready;
  const services = kernel.services.list();
  return NextResponse.json({
    total: services.length,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
      status: s.status,
      owner: s.owner,
      dependencies: s.dependencies,
    })),
  });
}
