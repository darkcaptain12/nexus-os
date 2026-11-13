-- APEX OS — Migration 020: Trade Journal (Faz 2 Supabase persistence)
-- Canlı/paper trade journal kalıcılığı. Önceden in-memory globalThis idi.

create table if not exists public.trade_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('long', 'short')),
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  reason text not null default '',
  ai_rationale text not null default '',
  risk_score numeric not null default 0,
  result text not null default 'open' check (result in ('open', 'win', 'loss', 'breakeven')),
  pnl numeric not null default 0,
  strategy text,
  screenshot_ref text,
  executive_review text,
  exchange text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_trade_journal_user on public.trade_journal (user_id) where deleted_at is null;
create index if not exists idx_trade_journal_symbol on public.trade_journal (symbol) where deleted_at is null;
create index if not exists idx_trade_journal_result on public.trade_journal (result) where deleted_at is null;
create index if not exists idx_trade_journal_opened on public.trade_journal (opened_at desc) where deleted_at is null;

alter table public.trade_journal enable row level security;

-- RLS: kullanıcı yalnız kendi journal'ını görür/yazar
create policy trade_journal_select on public.trade_journal
  for select using (auth.uid() = (select auth_id from public.users where id = user_id));
create policy trade_journal_insert on public.trade_journal
  for insert with check (auth.uid() = (select auth_id from public.users where id = user_id));
create policy trade_journal_update on public.trade_journal
  for update using (auth.uid() = (select auth_id from public.users where id = user_id));

-- updated_at trigger (mevcut update_updated_at fonksiyonu reuse)
create trigger trade_journal_updated_at before update on public.trade_journal
  for each row execute function update_updated_at();

-- service_role tam erişim (server-side write-through için)
grant all on public.trade_journal to service_role;
