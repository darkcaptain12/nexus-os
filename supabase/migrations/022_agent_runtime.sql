-- APEX OS — Migration 022: Agent runtime state (Faz 2 persistence)
-- Agent Runtime lifecycle (state/goal/metrics). Önceden in-memory globalThis idi.
-- Not: public.agents = statik agent config; bu tablo = çalışan agent instance state.

create table if not exists public.agent_runtime (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  goal text not null default '',
  state text not null default 'CREATED',
  memory_ref text,
  workflow_ref text,
  current_task text,
  retries int not null default 0,
  max_retries int not null default 3,
  priority int not null default 3,
  error_message text,
  plan jsonb,
  approval_id text,
  metrics jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_agent_runtime_state on public.agent_runtime (state) where deleted_at is null;
create index if not exists idx_agent_runtime_created on public.agent_runtime (created_at desc) where deleted_at is null;

alter table public.agent_runtime enable row level security;
create policy agent_runtime_all on public.agent_runtime
  for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id));
create trigger agent_runtime_updated_at before update on public.agent_runtime
  for each row execute function update_updated_at();
grant all on public.agent_runtime to service_role;
