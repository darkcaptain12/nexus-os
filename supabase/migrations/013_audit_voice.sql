-- APEX OS — Migration 013: Audit System & Voice

-- === AUDIT ===

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  performed_by text not null default 'system',
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_logs_table on audit_logs (table_name, created_at desc);
create index idx_audit_logs_record on audit_logs (record_id) where record_id is not null;
create index idx_audit_logs_performer on audit_logs (performed_by, created_at desc);

create table security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'login', 'logout', 'failed_login', 'password_change', 'role_change', 'api_key_created', 'suspicious_activity'
  severity text not null default 'info', -- 'info', 'warning', 'critical'
  user_id uuid references users(id),
  ip_address inet,
  user_agent text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_security_events_type on security_events (event_type, created_at desc);
create index idx_security_events_user on security_events (user_id, created_at desc) where user_id is not null;
create index idx_security_events_severity on security_events (severity) where severity in ('warning', 'critical');

create table login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  success boolean not null,
  ip_address inet,
  user_agent text,
  device_id uuid references user_devices(id),
  method text not null default 'password', -- 'password', 'oauth', 'magic_link', 'api_key'
  provider text,
  error text,
  created_at timestamptz not null default now()
);

create index idx_login_history_user on login_history (user_id, created_at desc);

create table api_logs (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  path text not null,
  status_code integer not null,
  duration_ms integer not null,
  user_id uuid references users(id),
  api_key_id uuid references api_keys(id),
  ip_address inet,
  request_size integer,
  response_size integer,
  error text,
  created_at timestamptz not null default now()
);

create index idx_api_logs_path on api_logs (path, created_at desc);
create index idx_api_logs_user on api_logs (user_id, created_at desc) where user_id is not null;

-- === VOICE ===

create table voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  device_id uuid references user_devices(id),
  status text not null default 'active', -- 'active', 'ended', 'error'
  language text not null default 'tr-TR',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_commands integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_voice_sessions_user on voice_sessions (user_id, created_at desc);

create table voice_commands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references voice_sessions(id) on delete cascade,
  transcript text not null,
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  intent text,
  entities jsonb not null default '{}',
  agent_run_id uuid references agent_runs(id),
  response_text text,
  response_audio_path text,
  processing_ms integer,
  created_at timestamptz not null default now()
);

create index idx_voice_commands_session on voice_commands (session_id, created_at);

-- === AUDIT TRIGGERS (on critical tables) ===

create trigger trg_audit_users after insert or update or delete on users for each row execute function audit_log_trigger();
create trigger trg_audit_agents after insert or update or delete on agents for each row execute function audit_log_trigger();
create trigger trg_audit_positions after insert or update or delete on positions for each row execute function audit_log_trigger();
create trigger trg_audit_trade_orders after insert or update or delete on trade_orders for each row execute function audit_log_trigger();
create trigger trg_audit_automations after insert or update or delete on automations for each row execute function audit_log_trigger();
create trigger trg_audit_workflows after insert or update or delete on workflows for each row execute function audit_log_trigger();
