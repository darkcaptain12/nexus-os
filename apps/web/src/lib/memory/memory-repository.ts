import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TimelineEntry, DecisionEntry } from './types';

// Memory Supabase persistence (Faz 2). Service-role write-through — timeline +
// decisions kalıcılığı. Supabase yoksa null/false (graceful, globalThis fallback).

let cached: SupabaseClient | null | undefined;

function serviceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

export async function persistTimelineEntry(e: TimelineEntry): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('memory_timeline').upsert(
    {
      id: e.id,
      source: e.source,
      title: e.title,
      description: e.description,
      entry_timestamp: e.timestamp,
      metadata: e.metadata ?? {},
    },
    { onConflict: 'id' },
  );
  return !error;
}

export async function persistDecisionEntry(e: DecisionEntry): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('memory_decisions').upsert(
    {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      reason: e.reason,
      impact: e.impact,
      decision_timestamp: e.timestamp,
      source: e.source,
      metadata: e.metadata ?? {},
    },
    { onConflict: 'id' },
  );
  return !error;
}

export async function loadTimelineFromDb(limit = 200): Promise<TimelineEntry[] | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data, error } = await db
    .from('memory_timeline')
    .select('*')
    .is('deleted_at', null)
    .order('entry_timestamp', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return data.map((r) => ({
    id: String(r['id']),
    source: r['source'] as TimelineEntry['source'],
    title: String(r['title']),
    description: String(r['description'] ?? ''),
    timestamp: String(r['entry_timestamp']),
    metadata: (r['metadata'] as Record<string, unknown>) ?? {},
  }));
}

export async function loadDecisionsFromDb(limit = 100): Promise<DecisionEntry[] | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data, error } = await db
    .from('memory_decisions')
    .select('*')
    .is('deleted_at', null)
    .order('decision_timestamp', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return data.map((r) => ({
    id: String(r['id']),
    title: String(r['title']),
    description: String(r['description'] ?? ''),
    category: r['category'] as DecisionEntry['category'],
    reason: String(r['reason'] ?? ''),
    impact: r['impact'] as DecisionEntry['impact'],
    timestamp: String(r['decision_timestamp']),
    source: String(r['source'] ?? ''),
    metadata: (r['metadata'] as Record<string, unknown>) ?? {},
  }));
}
