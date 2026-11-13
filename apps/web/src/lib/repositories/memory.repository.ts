import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { DateRange, ListResult, RepositoryResult } from './types';

export interface MemoryRecord {
  id: string;
  type: string;
  content: string;
  summary: string | null;
  source: string;
  owner_id: string | null;
  privacy: string;
  importance: number;
  tags: string[];
  access_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemoryLinkRecord {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  strength: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MemoryEntityRecord {
  id: string;
  memory_id: string;
  name: string;
  entity_type: string;
  confidence: number;
  created_at: string;
}

export interface MemoryHealthReport {
  totalMemories: number;
  orphanMemories: number;
  duplicateCandidates: number;
  lowImportance: number;
  missingType: number;
  avgImportance: number;
  typeDistribution: Record<string, number>;
}

export interface MemoryGraphNode {
  id: string;
  title: string;
  type: string;
  importance: number;
}

export interface MemoryGraphEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number;
}

export class MemoryRepository extends BaseRepository<MemoryRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'memories');
  }

  async findByType(type: string, limit = 20): Promise<ListResult<MemoryRecord>> {
    return this.instrument('findByType', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('type', type)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findByDateRange(range: DateRange, limit = 50): Promise<ListResult<MemoryRecord>> {
    return this.instrument('findByDateRange', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .gte('created_at', range.from)
        .lte('created_at', range.to)
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async searchContent(query: string, limit = 20): Promise<ListResult<MemoryRecord>> {
    return this.instrument('searchContent', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .or(`content.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('importance', { ascending: false })
        .limit(limit);
      return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findRelated(
    memoryId: string,
  ): Promise<{ memories: MemoryRecord[]; links: MemoryLinkRecord[] }> {
    return this.instrument('findRelated', async () => {
      const { data: outLinks } = await this.db
        .from('memory_links')
        .select('*')
        .eq('source_id', memoryId);
      const { data: inLinks } = await this.db
        .from('memory_links')
        .select('*')
        .eq('target_id', memoryId);

      const links = [...(outLinks ?? []), ...(inLinks ?? [])] as MemoryLinkRecord[];
      const relatedIds = new Set<string>();
      for (const link of links) {
        if (link.source_id !== memoryId) relatedIds.add(link.source_id);
        if (link.target_id !== memoryId) relatedIds.add(link.target_id);
      }

      if (relatedIds.size === 0) return { memories: [], links };

      const { data } = await this.db
        .from(this.tableName)
        .select('*')
        .in('id', [...relatedIds])
        .is('deleted_at', null);

      return { memories: (data as MemoryRecord[]) ?? [], links };
    });
  }

  async addLink(
    sourceId: string,
    targetId: string,
    relationship: string,
    strength = 0.5,
  ): Promise<RepositoryResult<MemoryLinkRecord>> {
    return this.instrument('addLink', async () => {
      const { data, error } = await this.db
        .from('memory_links')
        .upsert(
          { source_id: sourceId, target_id: targetId, relationship, strength } as Record<
            string,
            unknown
          >,
          { onConflict: 'source_id,target_id,relationship' },
        )
        .select()
        .single();
      return { data: data as MemoryLinkRecord | null, error: error?.message ?? null };
    });
  }

  async getGraph(limit = 50): Promise<{ nodes: MemoryGraphNode[]; edges: MemoryGraphEdge[] }> {
    return this.instrument('getGraph', async () => {
      const { data: memories } = await this.db
        .from(this.tableName)
        .select('id, content, type, importance')
        .is('deleted_at', null)
        .order('importance', { ascending: false })
        .limit(limit);

      const nodes: MemoryGraphNode[] = (memories ?? []).map((m: Record<string, unknown>) => ({
        id: m['id'] as string,
        title: ((m['content'] as string) ?? '').substring(0, 60),
        type: m['type'] as string,
        importance: m['importance'] as number,
      }));

      const nodeIds = nodes.map((n) => n.id);
      if (nodeIds.length === 0) return { nodes: [], edges: [] };

      const { data: links } = await this.db
        .from('memory_links')
        .select('*')
        .or(`source_id.in.(${nodeIds.join(',')}),target_id.in.(${nodeIds.join(',')})`);

      const edges: MemoryGraphEdge[] = (links ?? []).map((l: Record<string, unknown>) => ({
        source: l['source_id'] as string,
        target: l['target_id'] as string,
        relationship: l['relationship'] as string,
        strength: l['strength'] as number,
      }));

      return { nodes, edges };
    });
  }

  async findDuplicates(
    threshold = 0.9,
  ): Promise<{ pairs: { a: MemoryRecord; b: MemoryRecord; similarity: number }[] }> {
    return this.instrument('findDuplicates', async () => {
      const { data } = await this.db
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);

      const memories = (data as MemoryRecord[]) ?? [];
      const pairs: { a: MemoryRecord; b: MemoryRecord; similarity: number }[] = [];

      for (let i = 0; i < memories.length; i++) {
        for (let j = i + 1; j < memories.length; j++) {
          const similarity = calculateTextSimilarity(memories[i]!.content, memories[j]!.content);
          if (similarity >= threshold) {
            pairs.push({ a: memories[i]!, b: memories[j]!, similarity });
          }
        }
      }

      return { pairs: pairs.sort((a, b) => b.similarity - a.similarity).slice(0, 20) };
    });
  }

  async getHealth(): Promise<MemoryHealthReport> {
    return this.instrument('getHealth', async () => {
      const { data: all } = await this.db
        .from(this.tableName)
        .select('id, type, importance, tags')
        .is('deleted_at', null);
      const memories = (all ?? []) as {
        id: string;
        type: string;
        importance: number;
        tags: string[];
      }[];

      const { data: linkedIds } = await this.db.from('memory_links').select('source_id, target_id');
      const linkedSet = new Set<string>();
      for (const l of (linkedIds ?? []) as { source_id: string; target_id: string }[]) {
        linkedSet.add(l.source_id);
        linkedSet.add(l.target_id);
      }

      const typeDistribution: Record<string, number> = {};
      let totalImportance = 0;
      for (const m of memories) {
        typeDistribution[m.type] = (typeDistribution[m.type] ?? 0) + 1;
        totalImportance += m.importance;
      }

      const duplicates = await this.findDuplicates(0.85);

      return {
        totalMemories: memories.length,
        orphanMemories: memories.filter((m) => !linkedSet.has(m.id)).length,
        duplicateCandidates: duplicates.pairs.length,
        lowImportance: memories.filter((m) => m.importance < 0.2).length,
        missingType: memories.filter((m) => !m.type).length,
        avgImportance:
          memories.length > 0 ? Math.round((totalImportance / memories.length) * 100) / 100 : 0,
        typeDistribution,
      };
    });
  }

  async addEntity(
    memoryId: string,
    name: string,
    entityType: string,
    confidence = 0.8,
  ): Promise<RepositoryResult<MemoryEntityRecord>> {
    return this.instrument('addEntity', async () => {
      const { data, error } = await this.db
        .from('memory_entities')
        .insert({ memory_id: memoryId, name, entity_type: entityType, confidence } as Record<
          string,
          unknown
        >)
        .select()
        .single();
      return { data: data as MemoryEntityRecord | null, error: error?.message ?? null };
    });
  }

  async getEntities(memoryId: string): Promise<ListResult<MemoryEntityRecord>> {
    return this.instrument('getEntities', async () => {
      const { data, error } = await this.db
        .from('memory_entities')
        .select('*')
        .eq('memory_id', memoryId)
        .order('confidence', { ascending: false });
      return { data: (data as MemoryEntityRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findByEntity(entityName: string, limit = 20): Promise<ListResult<MemoryRecord>> {
    return this.instrument('findByEntity', async () => {
      const { data: entityRows } = await this.db
        .from('memory_entities')
        .select('memory_id')
        .ilike('name', `%${entityName}%`)
        .limit(limit);

      const memoryIds = (entityRows ?? []).map((e: { memory_id: string }) => e.memory_id);
      if (memoryIds.length === 0) return { data: [], error: null };

      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .in('id', memoryIds)
        .is('deleted_at', null);
      return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async updateImportance(id: string, importance: number): Promise<RepositoryResult<MemoryRecord>> {
    return this.instrument('updateImportance', async () =>
      this.update(id, {
        importance: Math.max(0, Math.min(1, importance)),
      } as Partial<MemoryRecord>),
    );
  }

  async incrementAccessCount(id: string): Promise<void> {
    return this.instrument('incrementAccessCount', async () => {
      await this.db
        .from(this.tableName)
        .update({ last_accessed_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', id);
    });
  }

  async cleanupExpired(): Promise<number> {
    return this.instrument('cleanupExpired', async () => {
      const { data } = await this.db
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .lt('expires_at', new Date().toISOString())
        .is('deleted_at', null)
        .select('id');
      return data?.length ?? 0;
    });
  }
}

export class ConversationRepository extends BaseRepository<{
  id: string;
  user_id: string | null;
  title: string | null;
  summary: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}> {
  constructor(db: SupabaseClient) {
    super(db, 'conversations');
  }

  async getWithMessages(conversationId: string) {
    return this.instrument('getWithMessages', async () => {
      const { data: conversation } = await this.db
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      const { data: messages } = await this.db
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      return { conversation, messages: messages ?? [] };
    });
  }
}

function calculateTextSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / Math.max(wordsA.size, wordsB.size);
}
