import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepositoryResult, ListResult } from './types';
import { instrumentQuery } from './query-audit';

interface NoteRecord {
  id: string;
  title: string;
  content: string;
  format: string;
  collection_id: string | null;
  tags: string[];
  pinned: boolean;
  owner_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class JournalRepository {
  constructor(private db: SupabaseClient) {}

  private instrument<R>(operation: string, fn: () => Promise<R>): Promise<R> {
    return instrumentQuery('notes', operation, fn);
  }

  async saveJournal(
    date: string,
    userId: string,
    content: string,
  ): Promise<RepositoryResult<NoteRecord>> {
    return this.instrument('saveJournal', async () => {
      const existing = await this.findJournalByDate(date, userId);
      if (existing.data) {
        const { data, error } = await this.db
          .from('notes')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id)
          .select()
          .single();
        return { data: data as NoteRecord | null, error: error?.message ?? null };
      }

      const { data, error } = await this.db
        .from('notes')
        .insert({
          title: `Günlük — ${date}`,
          content,
          format: 'markdown',
          tags: ['journal', 'auto-generated'],
          owner_id: userId,
          metadata: { type: 'daily-journal', date },
        })
        .select()
        .single();

      return { data: data as NoteRecord | null, error: error?.message ?? null };
    });
  }

  async findJournalByDate(date: string, userId: string): Promise<RepositoryResult<NoteRecord>> {
    return this.instrument('findJournalByDate', async () => {
      const { data, error } = await this.db
        .from('notes')
        .select('*')
        .eq('owner_id', userId)
        .contains('tags', ['journal'])
        .contains('metadata', { date })
        .is('deleted_at', null)
        .single();

      return { data: data as NoteRecord | null, error: error?.message ?? null };
    });
  }

  async getRecentJournals(userId: string, limit = 7): Promise<ListResult<NoteRecord>> {
    return this.instrument('getRecentJournals', async () => {
      const { data, error } = await this.db
        .from('notes')
        .select('*')
        .eq('owner_id', userId)
        .contains('tags', ['journal'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: (data as NoteRecord[]) ?? [], error: error?.message ?? null };
    });
  }
}

export class DecisionRepository {
  constructor(private db: SupabaseClient) {}

  private instrument<R>(operation: string, fn: () => Promise<R>): Promise<R> {
    return instrumentQuery('notes', operation, fn);
  }

  async create(decision: {
    title: string;
    content: string;
    category: string;
    impact: string;
    reason: string;
    userId: string;
    projectId?: string;
  }): Promise<RepositoryResult<NoteRecord>> {
    return this.instrument('create', async () => {
      const { data, error } = await this.db
        .from('notes')
        .insert({
          title: `Karar: ${decision.title}`,
          content: `## ${decision.title}\n\n${decision.content}\n\n**Neden:** ${decision.reason}\n**Etki:** ${decision.impact}`,
          format: 'markdown',
          tags: ['decision', decision.category],
          owner_id: decision.userId,
          metadata: {
            type: 'decision',
            category: decision.category,
            impact: decision.impact,
            projectId: decision.projectId,
          },
        })
        .select()
        .single();

      return { data: data as NoteRecord | null, error: error?.message ?? null };
    });
  }

  async findByCategory(
    category: string,
    userId: string,
    limit = 20,
  ): Promise<ListResult<NoteRecord>> {
    return this.instrument('findByCategory', async () => {
      const { data, error } = await this.db
        .from('notes')
        .select('*')
        .eq('owner_id', userId)
        .contains('tags', ['decision', category])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: (data as NoteRecord[]) ?? [], error: error?.message ?? null };
    });
  }
}
