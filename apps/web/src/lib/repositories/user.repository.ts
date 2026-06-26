import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepositoryResult } from './types';

export interface UserRecord {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface UserProfileRecord {
  id: string;
  user_id: string;
  bio: string | null;
  timezone: string;
  locale: string;
  currency: string;
  metadata: Record<string, unknown>;
}

export interface UserPreferencesRecord {
  id: string;
  user_id: string;
  theme: string;
  notifications_enabled: boolean;
  ai_auto_approve: boolean;
  voice_enabled: boolean;
  desktop_agent_enabled: boolean;
  settings: Record<string, unknown>;
}

export interface FullUserProfile {
  user: UserRecord;
  profile: UserProfileRecord;
  preferences: UserPreferencesRecord;
}

export class UserRepository {
  constructor(private db: SupabaseClient) {}

  async findByAuthId(authId: string): Promise<RepositoryResult<UserRecord>> {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .is('deleted_at', null)
      .single();

    return { data: data as UserRecord | null, error: error?.message ?? null };
  }

  async getFullProfile(authId: string): Promise<FullUserProfile | null> {
    const { data: user } = await this.db
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .is('deleted_at', null)
      .single();

    if (!user) return null;

    const { data: profile } = await this.db
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: preferences } = await this.db
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return {
      user: user as UserRecord,
      profile: (profile as UserProfileRecord) ?? {
        id: '',
        user_id: user.id,
        bio: null,
        timezone: 'Europe/Istanbul',
        locale: 'tr-TR',
        currency: 'TRY',
        metadata: {},
      },
      preferences: (preferences as UserPreferencesRecord) ?? {
        id: '',
        user_id: user.id,
        theme: 'dark',
        notifications_enabled: true,
        ai_auto_approve: false,
        voice_enabled: false,
        desktop_agent_enabled: false,
        settings: {},
      },
    };
  }

  async updateProfile(
    userId: string,
    updates: Partial<Pick<UserProfileRecord, 'bio' | 'timezone' | 'locale' | 'currency'>>,
  ): Promise<RepositoryResult<UserProfileRecord>> {
    const { data, error } = await this.db
      .from('user_profiles')
      .update(updates as Record<string, unknown>)
      .eq('user_id', userId)
      .select()
      .single();

    return { data: data as UserProfileRecord | null, error: error?.message ?? null };
  }

  async updatePreferences(
    userId: string,
    updates: Partial<
      Pick<
        UserPreferencesRecord,
        | 'theme'
        | 'notifications_enabled'
        | 'ai_auto_approve'
        | 'voice_enabled'
        | 'desktop_agent_enabled'
      >
    >,
  ): Promise<RepositoryResult<UserPreferencesRecord>> {
    const { data, error } = await this.db
      .from('user_preferences')
      .update(updates as Record<string, unknown>)
      .eq('user_id', userId)
      .select()
      .single();

    return { data: data as UserPreferencesRecord | null, error: error?.message ?? null };
  }

  async updateName(userId: string, name: string): Promise<RepositoryResult<UserRecord>> {
    const { data, error } = await this.db
      .from('users')
      .update({ name } as Record<string, unknown>)
      .eq('id', userId)
      .select()
      .single();

    return { data: data as UserRecord | null, error: error?.message ?? null };
  }

  async recordLogin(authId: string): Promise<void> {
    await this.db
      .from('users')
      .update({ last_login_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('auth_id', authId);
  }
}
