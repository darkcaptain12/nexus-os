-- APEX OS — Migration 010: Finance, Calendar, Health, Knowledge Base

-- === FINANCE ===

create type transaction_type as enum ('income', 'expense', 'transfer', 'investment', 'refund');

create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  type transaction_type not null,
  amount numeric(12, 2) not null,
  currency text not null default 'TRY',
  category text not null,
  description text,
  counterparty text,
  account text not null default 'main',
  recurring boolean not null default false,
  tags text[] not null default '{}',
  receipt_url text,
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_fin_transactions_owner on financial_transactions (owner_id, transaction_date desc) where deleted_at is null;
create index idx_fin_transactions_category on financial_transactions (category, transaction_date desc) where deleted_at is null;
create trigger trg_fin_transactions_updated before update on financial_transactions for each row execute function update_updated_at();

create table budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  amount numeric(12, 2) not null,
  spent numeric(12, 2) not null default 0,
  currency text not null default 'TRY',
  period text not null default 'monthly', -- 'weekly', 'monthly', 'yearly'
  period_start date not null,
  period_end date not null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_budgets_owner on budgets (owner_id, period_start desc);
create trigger trg_budgets_updated before update on budgets for each row execute function update_updated_at();

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'TRY',
  billing_cycle text not null default 'monthly',
  next_billing_date date,
  category text not null,
  provider text,
  status entity_status not null default 'active',
  cancellation_url text,
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_owner on subscriptions (owner_id) where status = 'active';
create trigger trg_subscriptions_updated before update on subscriptions for each row execute function update_updated_at();

-- === CALENDAR ===

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  recurring text, -- rrule
  color text,
  source text, -- 'manual', 'google', 'outlook', 'agent'
  source_id text,
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_calendar_events_owner on calendar_events (owner_id, start_at) where deleted_at is null;
create trigger trg_calendar_events_updated before update on calendar_events for each row execute function update_updated_at();

create table reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  remind_at timestamptz not null,
  channel notification_channel not null default 'push',
  recurring text,
  completed boolean not null default false,
  completed_at timestamptz,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reminders_owner on reminders (owner_id, remind_at) where completed = false;
create trigger trg_reminders_updated before update on reminders for each row execute function update_updated_at();

-- === HEALTH ===

create table health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  metric_type text not null, -- 'sleep', 'steps', 'heart_rate', 'water', 'weight', 'calories', 'workout'
  value numeric(10, 2) not null,
  unit text not null,
  source text, -- 'manual', 'apple_health', 'google_fit', 'fitbit'
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_health_metrics_user on health_metrics (user_id, metric_type, recorded_at desc);

-- === KNOWLEDGE BASE ===

create table notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  format text not null default 'markdown', -- 'markdown', 'html', 'plain'
  collection_id uuid,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  embedding vector(1536),
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_notes_owner on notes (owner_id, updated_at desc) where deleted_at is null;
create index idx_notes_tags on notes using gin (tags) where deleted_at is null;
create index idx_notes_search on notes using gin (to_tsvector('english', title || ' ' || content)) where deleted_at is null;
create index idx_notes_embedding on notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create trigger trg_notes_updated before update on notes for each row execute function update_updated_at();

create table collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  icon text,
  parent_id uuid references collections(id),
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_collections_updated before update on collections for each row execute function update_updated_at();

create table attachments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mime_type text not null,
  size integer not null,
  storage_path text not null,
  entity_type text not null, -- 'note', 'task', 'document', etc.
  entity_id uuid not null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now()
);

create index idx_attachments_entity on attachments (entity_type, entity_id);
