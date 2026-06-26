-- APEX OS — Migration 008: Trading Domain

create type trade_direction as enum ('long', 'short');
create type trade_status as enum ('open', 'closed', 'cancelled', 'pending', 'liquidated');
create type order_side as enum ('buy', 'sell');
create type order_type as enum ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop');

create table exchanges (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  type text not null, -- 'crypto', 'stock', 'forex'
  api_key_encrypted text,
  api_secret_encrypted text,
  sandbox boolean not null default true,
  status entity_status not null default 'active',
  config jsonb not null default '{}',
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_exchanges_updated before update on exchanges for each row execute function update_updated_at();

create table portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exchange_id uuid references exchanges(id),
  balance numeric(18, 8) not null default 0,
  currency text not null default 'USDT',
  pnl_total numeric(18, 8) not null default 0,
  pnl_today numeric(18, 8) not null default 0,
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolios_owner on portfolios (owner_id);
create trigger trg_portfolios_updated before update on portfolios for each row execute function update_updated_at();

create table positions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  symbol text not null,
  direction trade_direction not null,
  status trade_status not null default 'open',
  entry_price numeric(18, 8) not null,
  exit_price numeric(18, 8),
  quantity numeric(18, 8) not null,
  leverage numeric(6, 2) default 1,
  stop_loss numeric(18, 8),
  take_profit numeric(18, 8),
  pnl numeric(18, 8),
  pnl_percentage numeric(8, 4),
  fees numeric(18, 8) not null default 0,
  strategy text,
  signal_id uuid,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_positions_portfolio on positions (portfolio_id, status);
create index idx_positions_symbol on positions (symbol, status);
create index idx_positions_open on positions (status) where status = 'open';
create trigger trg_positions_updated before update on positions for each row execute function update_updated_at();

create table trade_orders (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id),
  position_id uuid references positions(id),
  exchange_id uuid references exchanges(id),
  symbol text not null,
  side order_side not null,
  type order_type not null,
  status execution_status not null default 'pending',
  price numeric(18, 8),
  quantity numeric(18, 8) not null,
  filled_quantity numeric(18, 8) not null default 0,
  average_price numeric(18, 8),
  exchange_order_id text,
  error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_trade_orders_portfolio on trade_orders (portfolio_id, created_at desc);
create index idx_trade_orders_status on trade_orders (status) where status in ('pending', 'running');
create trigger trg_trade_orders_updated before update on trade_orders for each row execute function update_updated_at();

create table trade_signals (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  direction trade_direction not null,
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  source text not null, -- 'ai', 'strategy', 'manual', 'external'
  strategy text,
  entry_price numeric(18, 8),
  stop_loss numeric(18, 8),
  take_profit numeric(18, 8),
  timeframe text,
  reasoning text,
  agent_id uuid references agents(id),
  acted_on boolean not null default false,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_trade_signals_symbol on trade_signals (symbol, created_at desc);

create table trade_strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null, -- 'momentum', 'mean_reversion', 'breakout', 'ai', etc.
  config jsonb not null default '{}',
  performance jsonb not null default '{}',
  status entity_status not null default 'active',
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_trade_strategies_updated before update on trade_strategies for each row execute function update_updated_at();

create table risk_profiles (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  max_position_size numeric(5, 2) not null default 5, -- % of portfolio
  max_daily_loss numeric(5, 2) not null default 3,
  max_open_positions integer not null default 5,
  max_leverage numeric(6, 2) not null default 10,
  stop_loss_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(portfolio_id)
);

create trigger trg_risk_profiles_updated before update on risk_profiles for each row execute function update_updated_at();
