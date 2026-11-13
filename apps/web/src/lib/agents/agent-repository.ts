import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AgentRecord } from './types';

// Agent Runtime Supabase persistence (Faz 2). Service-role write-through —
// çalışan agent state kalıcılığı (restart-safe recovery). Supabase yoksa graceful.

let cached: SupabaseClient | null | undefined;

function serviceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

export async function persistAgentRun(a: AgentRecord): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('agent_runtime').upsert(
    {
      id: a.id,
      name: a.name,
      goal: a.goal,
      state: a.state,
      memory_ref: a.memoryRef,
      workflow_ref: a.workflowRef ?? null,
      current_task: a.currentTask ?? null,
      retries: a.retries,
      max_retries: a.maxRetries,
      priority: a.priority,
      error_message: a.errorMessage ?? null,
      plan: a.plan ?? null,
      approval_id: a.approvalId ?? null,
      metrics: a.metrics,
      started_at: a.startedAt ?? null,
      completed_at: a.completedAt ?? null,
      failed_at: a.failedAt ?? null,
      cancelled_at: a.cancelledAt ?? null,
    },
    { onConflict: 'id' },
  );
  return !error;
}

export async function loadAgentRuns(limit = 50): Promise<AgentRecord[] | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data, error } = await db
    .from('agent_runtime')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return data.map((r) => ({
    id: String(r['id']),
    name: String(r['name']),
    goal: String(r['goal'] ?? ''),
    state: r['state'] as AgentRecord['state'],
    memoryRef: String(r['memory_ref'] ?? ''),
    workflowRef: (r['workflow_ref'] as string) ?? undefined,
    currentTask: (r['current_task'] as string) ?? undefined,
    retries: Number(r['retries'] ?? 0),
    maxRetries: Number(r['max_retries'] ?? 3),
    priority: Number(r['priority'] ?? 3) as AgentRecord['priority'],
    createdAt: String(r['created_at']),
    updatedAt: String(r['updated_at']),
    startedAt: (r['started_at'] as string) ?? undefined,
    completedAt: (r['completed_at'] as string) ?? undefined,
    failedAt: (r['failed_at'] as string) ?? undefined,
    cancelledAt: (r['cancelled_at'] as string) ?? undefined,
    errorMessage: (r['error_message'] as string) ?? undefined,
    plan: (r['plan'] as AgentRecord['plan']) ?? undefined,
    approvalId: (r['approval_id'] as string) ?? undefined,
    metrics: r['metrics'] as AgentRecord['metrics'],
  }));
}
