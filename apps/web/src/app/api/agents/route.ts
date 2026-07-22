import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getAgentStore } from '@/lib/agents/agent-store';
import { createAgent } from '@/lib/agents/agent-runtime';

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().min(1).max(500),
  priority: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

async function handleGET() {
  const store = getAgentStore();
  return NextResponse.json({
    agents: store.getAll(50),
    metrics: store.getMetrics(),
    generatedAt: new Date().toISOString(),
  });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const agent = createAgent(parsed.data);
  return NextResponse.json({ agent }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
