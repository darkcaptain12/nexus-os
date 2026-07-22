-- APEX OS — Migration 019: Memory Entity Extraction

set search_path = public;

create table memory_entities (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  name text not null,
  entity_type text not null,
  confidence numeric(3, 2) not null default 0.8 check (confidence between 0 and 1),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_memory_entities_memory on memory_entities (memory_id);
create index idx_memory_entities_type on memory_entities (entity_type);
create index idx_memory_entities_name on memory_entities using gin (to_tsvector('simple', name));

alter table memory_entities enable row level security;
create policy "memory_entities_via_memory" on memory_entities for all using (
  memory_id in (select id from memories where owner_id = auth_user_id())
);
