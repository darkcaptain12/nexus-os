import type { BaseEntity } from './base';

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  preferences: UserPreferences;
  last_login_at?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  notifications_enabled: boolean;
}
