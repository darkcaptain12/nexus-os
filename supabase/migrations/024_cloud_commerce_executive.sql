-- APEX OS — Migration 024: Cloud devices + Commerce queue + Executive lessons/goals
-- Faz 2 kalıcılık (kalan kritik store'lar). Kompleks alanlar jsonb.

create table if not exists public.cloud_devices (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  type text not null,
  platform text not null default '',
  state text not null default 'pending',
  trusted boolean not null default false,
  verified boolean not null default false,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_cloud_devices_state on public.cloud_devices (state) where deleted_at is null;

create table if not exists public.commerce_product_queue (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  status text not null default 'pending',
  title text,
  score numeric,
  data jsonb not null default '{}',
  queued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_commerce_queue_status on public.commerce_product_queue (status) where deleted_at is null;

create table if not exists public.executive_lessons (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  domain text not null,
  ref text not null,
  cause text not null default '',
  recurrence_risk text not null default 'low',
  prevention text not null default '',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_exec_lessons_domain on public.executive_lessons (domain) where deleted_at is null;

create table if not exists public.executive_goals (
  id uuid primary key,
  user_id uuid references public.users(id) on delete cascade,
  label text not null,
  metric text not null,
  target numeric not null,
  period text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
declare tbl text;
begin
  foreach tbl in array array['cloud_devices','commerce_product_queue','executive_lessons','executive_goals']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format($p$create policy %I on public.%I for all using (user_id is null or auth.uid() = (select auth_id from public.users where id = user_id))$p$, tbl||'_all', tbl);
    execute format('grant all on public.%I to service_role', tbl);
  end loop;
end $$;

create trigger cloud_devices_updated_at before update on public.cloud_devices for each row execute function update_updated_at();
create trigger commerce_queue_updated_at before update on public.commerce_product_queue for each row execute function update_updated_at();
