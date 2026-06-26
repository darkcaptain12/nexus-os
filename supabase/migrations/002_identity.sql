-- APEX OS — Migration 002: Identity Domain
-- Users, profiles, sessions, API keys, roles, permissions

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique, -- Supabase Auth reference
  email text unique not null,
  name text not null,
  avatar_url text,
  role user_role not null default 'member',
  status entity_status not null default 'active',
  email_verified boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_users_email on users (email) where deleted_at is null;
create index idx_users_auth_id on users (auth_id) where deleted_at is null;
create index idx_users_role on users (role) where deleted_at is null;
create trigger trg_users_updated before update on users for each row execute function update_updated_at();

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  bio text,
  timezone text not null default 'Europe/Istanbul',
  locale text not null default 'tr-TR',
  currency text not null default 'TRY',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create trigger trg_user_profiles_updated before update on user_profiles for each row execute function update_updated_at();

create table user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  theme text not null default 'dark',
  notifications_enabled boolean not null default true,
  ai_auto_approve boolean not null default false,
  voice_enabled boolean not null default false,
  desktop_agent_enabled boolean not null default false,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create trigger trg_user_preferences_updated before update on user_preferences for each row execute function update_updated_at();

create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type text not null, -- 'web', 'mobile', 'desktop', 'browser_extension'
  fingerprint text unique,
  push_token text,
  last_active_at timestamptz,
  trusted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_user_devices_user on user_devices (user_id);
create trigger trg_user_devices_updated before update on user_devices for each row execute function update_updated_at();

create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id uuid references user_devices(id),
  token_hash text not null,
  ip_address inet,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_user_sessions_user on user_sessions (user_id) where revoked_at is null;
create index idx_user_sessions_expires on user_sessions (expires_at) where revoked_at is null;

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  prefix text not null, -- first 8 chars for identification
  scopes text[] not null default '{}',
  rate_limit integer not null default 100,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index idx_api_keys_user on api_keys (user_id) where revoked_at is null;

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  permissions text[] not null default '{}',
  system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_roles_updated before update on roles for each row execute function update_updated_at();

create table permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(resource, action)
);

-- Seed system roles
insert into roles (name, description, permissions, system_role) values
  ('owner', 'Full system access', array['*'], true),
  ('admin', 'Administrative access', array['users.*', 'settings.*', 'agents.*', 'memory.*'], true),
  ('member', 'Standard user access', array['trades.*', 'orders.*', 'memory.read', 'memory.write'], true),
  ('viewer', 'Read-only access', array['*.read'], true),
  ('agent', 'AI agent access', array['memory.*', 'agents.execute', 'tools.execute'], true),
  ('system', 'Internal system access', array['*'], true);
