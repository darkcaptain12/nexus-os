-- APEX OS — Migration 004: Memory Engine with pgvector

create type memory_type as enum (
  'working', 'short', 'long', 'semantic', 'conversation',
  'knowledge', 'project', 'document', 'relationship'
);
create type memory_privacy as enum ('public', 'private', 'system');

create table memories (
  id uuid primary key default gen_random_uuid(),
  type memory_type not null,
  content text not null,
  summary text,
  source text not null,
  owner_id uuid references users(id),
  agent_id uuid references agents(id),
  privacy memory_privacy not null default 'private',
  importance numeric(3, 2) not null default 0.5 check (importance between 0 and 1),
  tags text[] not null default '{}',
  access_count integer not null default 0,
  last_accessed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_memories_type on memories (type) where deleted_at is null;
create index idx_memories_owner on memories (owner_id) where deleted_at is null;
create index idx_memories_importance on memories (importance desc) where deleted_at is null;
create index idx_memories_tags on memories using gin (tags) where deleted_at is null;
create index idx_memories_expires on memories (expires_at) where expires_at is not null and deleted_at is null;
create index idx_memories_content_search on memories using gin (to_tsvector('english', content)) where deleted_at is null;
create trigger trg_memories_updated before update on memories for each row execute function update_updated_at();

create table memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  embedding vector(1536) not null, -- OpenAI ada-002 / text-embedding-3-small
  model text not null,
  dimensions integer not null default 1536,
  created_at timestamptz not null default now()
);

create index idx_memory_embeddings_memory on memory_embeddings (memory_id);
create index idx_memory_embeddings_vector on memory_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table memory_chunks (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_memory_chunks_memory on memory_chunks (memory_id, chunk_index);

create table memory_links (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references memories(id) on delete cascade,
  target_id uuid not null references memories(id) on delete cascade,
  relationship text not null,
  strength numeric(3, 2) not null default 0.5 check (strength between 0 and 1),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(source_id, target_id, relationship)
);

create index idx_memory_links_source on memory_links (source_id);
create index idx_memory_links_target on memory_links (target_id);

create table memory_access_log (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  operation text not null, -- 'read', 'write', 'search'
  agent_id uuid references agents(id),
  user_id uuid references users(id),
  query text,
  score numeric(5, 4),
  created_at timestamptz not null default now()
);

create index idx_memory_access_log_memory on memory_access_log (memory_id, created_at desc);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  agent_id uuid references agents(id),
  title text,
  summary text,
  message_count integer not null default 0,
  total_tokens integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_conversations_user on conversations (user_id, created_at desc) where deleted_at is null;
create trigger trg_conversations_updated before update on conversations for each row execute function update_updated_at();

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  tool_calls jsonb,
  token_count integer not null default 0,
  model text,
  cost numeric(10, 6),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_conversation_messages_conv on conversation_messages (conversation_id, created_at);

create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  source_url text,
  source_type text not null default 'upload', -- 'upload', 'url', 'api', 'generated'
  mime_type text,
  file_size integer,
  storage_path text,
  chunk_count integer not null default 0,
  status entity_status not null default 'active',
  owner_id uuid references users(id),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_documents_owner on documents (owner_id) where deleted_at is null;
create index idx_documents_tags on documents using gin (tags) where deleted_at is null;
create trigger trg_documents_updated before update on documents for each row execute function update_updated_at();

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_document_chunks_doc on document_chunks (document_id, chunk_index);
create index idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  source text not null,
  source_type text not null, -- 'document', 'conversation', 'web', 'user', 'system'
  confidence numeric(3, 2) not null default 0.8 check (confidence between 0 and 1),
  citations text[] not null default '{}',
  tags text[] not null default '{}',
  embedding vector(1536),
  owner_id uuid references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_knowledge_category on knowledge (category) where deleted_at is null;
create index idx_knowledge_tags on knowledge using gin (tags) where deleted_at is null;
create index idx_knowledge_embedding on knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_knowledge_search on knowledge using gin (to_tsvector('english', title || ' ' || content)) where deleted_at is null;
create trigger trg_knowledge_updated before update on knowledge for each row execute function update_updated_at();
