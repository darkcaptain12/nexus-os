import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KnowledgeNode, KnowledgeEdge } from './types';

// Knowledge Graph Supabase persistence (Faz 2). Service-role write-through —
// node/edge kalıcılığı. Supabase yoksa graceful (globalThis fallback).

let cached: SupabaseClient | null | undefined;

function serviceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

export async function persistKnowledgeNode(n: KnowledgeNode): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('knowledge_nodes').upsert(
    {
      id: n.id,
      type: n.type,
      name: n.name,
      normalized_name: n.normalizedName,
      content: n.content ?? null,
      occurrence_count: n.mentionCount,
      metadata: n.metadata,
    },
    { onConflict: 'id' },
  );
  return !error;
}

export async function persistKnowledgeEdge(e: KnowledgeEdge): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;
  const { error } = await db.from('knowledge_edges').upsert(
    {
      id: e.id,
      source_id: e.sourceId,
      target_id: e.targetId,
      relation: e.relation,
      weight: e.weight,
      metadata: e.metadata,
    },
    { onConflict: 'id' },
  );
  return !error;
}
