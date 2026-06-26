-- APEX OS — Migration 011: Desktop Agent & Browser Extension

-- === DESKTOP ===

create table desktop_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  application text not null,
  window_title text,
  activity_type text not null, -- 'focus', 'idle', 'input', 'switch'
  duration_seconds integer,
  metadata jsonb not null default '{}',
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_desktop_activity_user on desktop_activity_logs (user_id, recorded_at desc);

create table clipboard_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  content_type text not null, -- 'text', 'image', 'file', 'html'
  content text,
  preview text,
  source_app text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_clipboard_user on clipboard_history (user_id, created_at desc);

create table screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  storage_path text not null,
  application text,
  window_title text,
  ocr_text text,
  embedding extensions.vector(1536),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_screenshots_user on screenshots (user_id, created_at desc);

create table file_index (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  path text not null,
  name text not null,
  extension text,
  size bigint,
  mime_type text,
  last_modified timestamptz,
  indexed_at timestamptz not null default now(),
  content_hash text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_file_index_user on file_index (user_id);
create index idx_file_index_path on file_index (user_id, path);
create index idx_file_index_ext on file_index (extension);

-- === BROWSER ===

create table browser_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  url text not null,
  title text,
  domain text,
  visit_count integer not null default 1,
  duration_seconds integer,
  embedding extensions.vector(1536),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_browser_history_user on browser_history (user_id, visited_at desc);
create index idx_browser_history_domain on browser_history (domain, visited_at desc);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  url text not null,
  title text not null,
  description text,
  folder text,
  tags text[] not null default '{}',
  favicon_url text,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookmarks_user on bookmarks (user_id);
create index idx_bookmarks_tags on bookmarks using gin (tags);
create trigger trg_bookmarks_updated before update on bookmarks for each row execute function update_updated_at();
