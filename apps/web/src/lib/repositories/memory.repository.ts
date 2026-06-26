import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { DateRange, ListResult } from './types';

interface MemoryRecord {
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

interface ConversationRecord {
  id: string;
  user_id: string | null;
  title: string | null;
  summary: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class MemoryRepository extends BaseRepository<MemoryRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'memories');
  }

  async findByType(type: string, limit = 20): Promise<ListResult<MemoryRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('type', type)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
  }

  async findByDateRange(range: DateRange, limit = 50): Promise<ListResult<MemoryRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .gte('created_at', range.from)
      .lte('created_at', range.to)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
  }

  async searchContent(query: string, limit = 20): Promise<ListResult<MemoryRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .or(`content.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('importance', { ascending: false })
      .limit(limit);

    return { data: (data as MemoryRecord[]) ?? [], error: error?.message ?? null };
  }

  async incrementAccessCount(id: string): Promise<void> {
    await this.db
      .from(this.tableName)
      .update({ last_accessed_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id);
  }

  async cleanupExpired(): Promise<number> {
    const { data } = await this.db
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .lt('expires_at', new Date().toISOString())
      .is('deleted_at', null)
      .select('id');

    return data?.length ?? 0;
  }
}

export class ConversationRepository extends BaseRepository<ConversationRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'conversations');
  }

  async getWithMessages(conversationId: string) {
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
  }
}
