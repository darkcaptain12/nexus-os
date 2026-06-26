-- APEX OS — Migration 006: Workflows

create type workflow_status as enum ('draft', 'active', 'paused', 'completed', 'failed', 'cancelled');
create type workflow_node_type as enum ('action', 'decision', 'loop', 'parallel', 'sequential', 'wait', 'checkpoint', 'compensation');

create table workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version text not null default '1.0',
  status entity_status not null default 'active',
  entry_node_id text,
  timeout integer not null default 3600000,
  retry_policy jsonb not null default '{"maxRetries": 3, "backoffMs": 1000}',
  owner_id uuid references users(id),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_workflows_owner on workflows (owner_id) where deleted_at is null;
create trigger trg_workflows_updated before update on workflows for each row execute function update_updated_at();

create table workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  node_key text not null,
  type workflow_node_type not null,
  name text not null,
  handler text not null,
  config jsonb not null default '{}',
  timeout integer not null default 60000,
  retries integer not null default 0,
  compensation_handler text,
  created_at timestamptz not null default now(),
  unique(workflow_id, node_key)
);

create table workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  from_node text not null,
  to_node text not null,
  condition jsonb,
  created_at timestamptz not null default now()
);

create index idx_workflow_edges_workflow on workflow_edges (workflow_id);

create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id),
  status workflow_status not null default 'draft',
  current_node text,
  input jsonb not null default '{}',
  state jsonb not null default '{}',
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  user_id uuid references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_workflow_runs_workflow on workflow_runs (workflow_id, created_at desc);
create index idx_workflow_runs_status on workflow_runs (status) where status in ('draft', 'active');

create table workflow_run_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  node_key text not null,
  status execution_status not null,
  input jsonb,
  output jsonb,
  error text,
  duration_ms integer,
  attempt integer not null default 1,
  created_at timestamptz not null default now()
);

create index idx_workflow_run_logs_run on workflow_run_logs (run_id, created_at);

create table workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  definition jsonb not null,
  version text not null default '1.0',
  public boolean not null default false,
  usage_count integer not null default 0,
  owner_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_workflow_templates_updated before update on workflow_templates for each row execute function update_updated_at();
