-- APEX OS — Migration 003: AI Agents Domain

create type agent_type as enum ('single', 'planner', 'executor', 'reviewer', 'coordinator');

create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  type agent_type not null default 'single',
  version text not null default '0.1.0',
  system_prompt text not null,
  model text,
  provider text,
  capabilities text[] not null default '{}',
  permissions text[] not null default '{}',
  tool_access text[] not null default '{}',
  priority priority_level not null default 'normal',
  cost_limit numeric(10, 4) not null default 1.0,
  timeout integer not null default 30000,
  status entity_status not null default 'active',
  owner_id uuid references users(id),
  config jsonb not null default '{}',
  tags text[] not null default '{}',
  total_runs integer not null default 0,
  success_rate numeric(5, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_agents_status on agents (status) where deleted_at is null;
create index idx_agents_type on agents (type) where deleted_at is null;
create index idx_agents_capabilities on agents using gin (capabilities) where deleted_at is null;
create trigger trg_agents_updated before update on agents for each row execute function update_updated_at();

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  status execution_status not null default 'pending',
  input text not null,
  output text,
  reasoning jsonb,
  error jsonb,
  model text,
  provider text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost numeric(10, 6) not null default 0,
  latency_ms integer,
  parent_run_id uuid references agent_runs(id),
  correlation_id uuid,
  user_id uuid references users(id),
  metadata jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_agent_runs_agent on agent_runs (agent_id, created_at desc);
create index idx_agent_runs_status on agent_runs (status) where status in ('pending', 'running');
create index idx_agent_runs_correlation on agent_runs (correlation_id);

create table agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  tool_name text not null,
  input jsonb not null,
  output jsonb,
  success boolean,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index idx_agent_tool_calls_run on agent_tool_calls (run_id);

create table agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_runs integer not null default 0,
  successful_runs integer not null default 0,
  failed_runs integer not null default 0,
  total_tokens integer not null default 0,
  total_cost numeric(10, 4) not null default 0,
  avg_latency_ms integer not null default 0,
  p95_latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_agent_metrics_agent_period on agent_metrics (agent_id, period_start desc);
