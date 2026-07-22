-- APEX OS — Migration 021: Memory timeline + decisions (Faz 2 persistence)
-- Executive Memory god-node kalıcılığı. Önceden in-memory globalThis idi.

create table if not exists public.memory_timeline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  source text not null,
  title text not null,
  description text not null default '',
  entry_timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_memory_timeline_source on public.memory_timeline (source) where deleted_at is null;
create index if not exists idx_memory_timeline_ts on public.memory_timeline (entry_timestamp desc) where deleted_at is null;

create table if not exists public.memory_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'ai',
  reason text not null default '',
  impact text not null default 'medium',
  decision_timestamp timestamptz not null default now(),
  source text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_memory_decisions_category on public.memory_decisions (category) where deleted_at is null;
create index if not exists idx_memory_decisions_ts on public.memory_decisions (decision_timestamp desc) where deleted_at is null;

alter table public.memory_timeline enable row level security;
alter table public.memory_decisions enable row level security;

-- RLS: kullanıcı yalnız kendi belleğini (user_id null = tek kullanıcı sistemi service-role write-through)
create policy memory_timeline_all on public.memory_timeline
  for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id));
create policy memory_decisions_all on public.memory_decisions
  for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id));

create trigger memory_timeline_updated_at before update on public.memory_timeline
  for each row execute function update_updated_at();
create trigger memory_decisions_updated_at before update on public.memory_decisions
  for each row execute function update_updated_at();

grant all on public.memory_timeline to service_role;
grant all on public.memory_decisions to service_role;
