import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Faz 2 kalıcılık — Cloud/Commerce/Executive kritik store'lar için service-role
// write-through. Tip-bağımsız (düz obje) — çağıran store kendi tipini map eder.
// Supabase yoksa false (graceful, globalThis fallback).

let cached: SupabaseClient | null | undefined;

function serviceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

async function upsert(table: string, row: Record<string, unknown>): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from(table).upsert(row, { onConflict: 'id' });
  return !error;
}

export function persistCloudDevice(
  d: {
    id: string;
    name: string;
    type: string;
    platform: string;
    state: string;
    trusted: boolean;
    verified: boolean;
  } & Record<string, unknown>,
): Promise<boolean> {
  const { id, name, type, platform, state, trusted, verified, ...rest } = d;
  return upsert('cloud_devices', {
    id,
    name,
    type,
    platform,
    state,
    trusted,
    verified,
    data: rest,
  });
}

export function persistProductQueue(
  p: {
    id: string;
    status: string;
    queuedAt?: string;
    title?: string;
    score?: { total: number } | number;
  } & Record<string, unknown>,
): Promise<boolean> {
  const { id, status, queuedAt, title, score, ...rest } = p;
  const scoreNum =
    typeof score === 'object' && score ? score.total : typeof score === 'number' ? score : null;
  return upsert('commerce_product_queue', {
    id,
    status,
    title: title ?? null,
    score: scoreNum,
    data: { title, score, ...rest },
    queued_at: queuedAt ?? new Date().toISOString(),
  });
}

export function persistLesson(l: {
  id: string;
  domain: string;
  ref: string;
  cause: string;
  recurrenceRisk: string;
  prevention: string;
}): Promise<boolean> {
  return upsert('executive_lessons', {
    id: l.id,
    domain: l.domain,
    ref: l.ref,
    cause: l.cause,
    recurrence_risk: l.recurrenceRisk,
    prevention: l.prevention,
  });
}

export function persistGoal(g: {
  id: string;
  label: string;
  metric: string;
  target: number;
  period: string;
}): Promise<boolean> {
  return upsert('executive_goals', {
    id: g.id,
    label: g.label,
    metric: g.metric,
    target: g.target,
    period: g.period,
  });
}
