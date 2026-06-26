import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListResult } from './types';

interface DesktopActivityRecord {
  id: string;
  user_id: string;
  application: string;
  window_title: string | null;
  activity_type: string;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

export class DesktopRepository {
  constructor(private db: SupabaseClient) {}

  async insertBatch(records: Omit<DesktopActivityRecord, 'id' | 'created_at'>[]): Promise<ListResult<DesktopActivityRecord>> {
    if (records.length === 0) return { data: [], error: null };

    const { data, error } = await this.db
      .from('desktop_activity_logs')
      .insert(records)
      .select();

    return { data: (data as DesktopActivityRecord[]) ?? [], error: error?.message ?? null };
  }

  async findByDate(date: string, limit = 100): Promise<ListResult<DesktopActivityRecord>> {
    const nextDate = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]!;

    const { data, error } = await this.db
      .from('desktop_activity_logs')
      .select('*')
      .gte('recorded_at', date)
      .lt('recorded_at', nextDate)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    return { data: (data as DesktopActivityRecord[]) ?? [], error: error?.message ?? null };
  }

  async getTopApps(date: string, limit = 10) {
    const activities = await this.findByDate(date, 500);
    const appTotals = new Map<string, number>();

    for (const a of activities.data) {
      appTotals.set(a.application, (appTotals.get(a.application) ?? 0) + (a.duration_seconds ?? 0));
    }

    return [...appTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([app, seconds]) => ({ app, seconds }));
  }

  async getActivityCount(date: string): Promise<number> {
    const nextDate = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]!;

    const { count } = await this.db
      .from('desktop_activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('recorded_at', date)
      .lt('recorded_at', nextDate);

    return count ?? 0;
  }
}
