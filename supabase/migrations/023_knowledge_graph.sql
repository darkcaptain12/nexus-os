-- APEX OS — Migration 023: Knowledge Graph nodes + edges (Faz 2 persistence)
-- İlişkisel hafıza god-node kalıcılığı. Önceden in-memory globalThis idi.

create table if not exists public.knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  name text not null,
  normalized_name text not null,
  content text,
  occurrence_count int not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_kg_nodes_norm on public.knowledge_nodes (normalized_name) where deleted_at is null;
create index if not exists idx_kg_nodes_type on public.knowledge_nodes (type) where deleted_at is null;

create table if not exists public.knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  source_id text not null,
  target_id text not null,
  relation text not null,
  weight numeric not null default 0.5,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_kg_edges_source on public.knowledge_edges (source_id) where deleted_at is null;
create index if not exists idx_kg_edges_target on public.knowledge_edges (target_id) where deleted_at is null;

alter table public.knowledge_nodes enable row level security;
alter table public.knowledge_edges enable row level security;
create policy kg_nodes_all on public.knowledge_nodes
  for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id));
create policy kg_edges_all on public.knowledge_edges
  for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id));
create trigger kg_nodes_updated_at before update on public.knowledge_nodes
  for each row execute function update_updated_at();
grant all on public.knowledge_nodes to service_role;
grant all on public.knowledge_edges to service_role;
