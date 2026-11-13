import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginationParams, PaginatedResult, RepositoryResult, ListResult } from './types';
import { instrumentQuery } from './query-audit';

export abstract class BaseRepository<T extends { id: string }> {
  constructor(
    protected db: SupabaseClient,
    protected tableName: string,
  ) {}

  protected async instrument<R>(operation: string, fn: () => Promise<R>): Promise<R> {
    return instrumentQuery(this.tableName, operation, fn);
  }

  async findById(id: string): Promise<RepositoryResult<T>> {
    return this.instrument('findById', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      return { data: data as T | null, error: error?.message ?? null };
    });
  }

  async findMany(
    filters?: Record<string, unknown>,
    pagination?: PaginationParams,
    orderBy = 'created_at',
    ascending = false,
  ): Promise<PaginatedResult<T>> {
    return this.instrument('findMany', async () => {
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order(orderBy, { ascending })
        .range(from, to);

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }

      const { data, error, count } = await query;
      const total = count ?? 0;

      if (error) {
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }

      return {
        data: (data as T[]) ?? [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async create(record: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<T>> {
    return this.instrument('create', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .insert(record as Record<string, unknown>)
        .select()
        .single();

      return { data: data as T | null, error: error?.message ?? null };
    });
  }

  async createMany(records: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<ListResult<T>> {
    return this.instrument('createMany', async () => {
      if (records.length === 0) return { data: [], error: null };

      const { data, error } = await this.db
        .from(this.tableName)
        .insert(records as Record<string, unknown>[])
        .select();

      return { data: (data as T[]) ?? [], error: error?.message ?? null };
    });
  }

  async update(id: string, updates: Partial<T>): Promise<RepositoryResult<T>> {
    return this.instrument('update', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      return { data: data as T | null, error: error?.message ?? null };
    });
  }

  async softDelete(id: string): Promise<RepositoryResult<T>> {
    return this.update(id, { deleted_at: new Date().toISOString() } as unknown as Partial<T>);
  }

  async count(filters?: Record<string, unknown>): Promise<number> {
    return this.instrument('count', async () => {
      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined) query = query.eq(key, value);
        }
      }

      const { count } = await query;
      return count ?? 0;
    });
  }

  async search(column: string, query: string, limit = 20): Promise<ListResult<T>> {
    return this.instrument('search', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .ilike(column, `%${query}%`)
        .limit(limit)
        .order('created_at', { ascending: false });

      return { data: (data as T[]) ?? [], error: error?.message ?? null };
    });
  }
}
