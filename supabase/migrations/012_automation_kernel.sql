-- APEX OS — Migration 012: Automation & Kernel Tables

-- === AUTOMATION ===

create type trigger_type as enum ('schedule', 'event', 'webhook', 'manual', 'condition');
create type action_type as enum ('api_call', 'notification', 'data_transform', 'ai_task', 'script', 'delay', 'branch');

create table automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status entity_status not null default 'active',
  trigger_type trigger_type not null,
  trigger_config jsonb not null,
  actions jsonb not null default '[]',
  conditions jsonb not null default '[]',
  run_count integer not null default 0,
  last_run_at timestamptz,
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_automations_owner on automations (owner_id) where deleted_at is null;
create index idx_automations_status on automations (status) where deleted_at is null;
create trigger trg_automations_updated before update on automations for each row execute function update_updated_at();

create table automation_executions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references automations(id),
  status execution_status not null default 'pending',
  trigger_data jsonb,
  input jsonb not null default '{}',
  output jsonb,
  error text,
  steps_completed integer not null default 0,
  steps_total integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_automation_executions_auto on automation_executions (automation_id, created_at desc);

create table automation_execution_logs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references automation_executions(id) on delete cascade,
  step_index integer not null,
  action_type action_type not null,
  status execution_status not null,
  input jsonb,
  output jsonb,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index idx_automation_exec_logs_exec on automation_execution_logs (execution_id);

-- === KERNEL ===

create table kernel_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  source text not null,
  payload jsonb not null,
  correlation_id uuid,
  causation_id uuid,
  version integer not null default 1,
  priority priority_level not null default 'normal',
  stream_id text,
  sequence bigint,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_kernel_events_type on kernel_events (type, created_at desc);
create index idx_kernel_events_stream on kernel_events (stream_id, sequence) where stream_id is not null;
create index idx_kernel_events_correlation on kernel_events (correlation_id) where correlation_id is not null;

create table kernel_commands (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  status execution_status not null default 'pending',
  result jsonb,
  error text,
  priority priority_level not null default 'normal',
  correlation_id uuid,
  user_id uuid references users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_kernel_commands_status on kernel_commands (status) where status in ('pending', 'running');

create table kernel_services (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  version text not null,
  status entity_status not null default 'active',
  health text not null default 'unknown', -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  dependencies text[] not null default '{}',
  config jsonb not null default '{}',
  last_health_check timestamptz,
  started_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_kernel_services_updated before update on kernel_services for each row execute function update_updated_at();

create table kernel_plugins (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  version text not null,
  description text,
  status text not null default 'installed', -- 'installed', 'enabled', 'disabled', 'error'
  permissions text[] not null default '{}',
  dependencies text[] not null default '{}',
  config jsonb not null default '{}',
  installed_at timestamptz not null default now(),
  enabled_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_kernel_plugins_updated before update on kernel_plugins for each row execute function update_updated_at();
