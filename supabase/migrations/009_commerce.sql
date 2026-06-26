-- APEX OS — Migration 009: Commerce Domain

create type commerce_order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned');

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null, -- 'shopify', 'trendyol', 'hepsiburada', 'amazon', 'custom'
  domain text,
  api_credentials_encrypted jsonb,
  currency text not null default 'TRY',
  status entity_status not null default 'active',
  config jsonb not null default '{}',
  owner_id uuid not null references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_shops_owner on shops (owner_id) where deleted_at is null;
create trigger trg_shops_updated before update on shops for each row execute function update_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  external_id text,
  sku text,
  title text not null,
  description text,
  price numeric(12, 2) not null,
  compare_at_price numeric(12, 2),
  cost numeric(12, 2),
  currency text not null default 'TRY',
  inventory_quantity integer not null default 0,
  status entity_status not null default 'active',
  images text[] not null default '{}',
  tags text[] not null default '{}',
  category text,
  vendor text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_products_shop on products (shop_id) where deleted_at is null;
create index idx_products_sku on products (shop_id, sku) where deleted_at is null;
create index idx_products_tags on products using gin (tags) where deleted_at is null;
create trigger trg_products_updated before update on products for each row execute function update_updated_at();

create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  external_id text,
  email text,
  name text not null,
  phone text,
  total_orders integer not null default 0,
  total_spent numeric(12, 2) not null default 0,
  currency text not null default 'TRY',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_shop on customers (shop_id);
create index idx_customers_email on customers (shop_id, email);
create trigger trg_customers_updated before update on customers for each row execute function update_updated_at();

create table commerce_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  customer_id uuid references customers(id),
  external_id text,
  order_number text not null,
  status commerce_order_status not null default 'pending',
  subtotal numeric(12, 2) not null,
  tax numeric(12, 2) not null default 0,
  shipping numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  currency text not null default 'TRY',
  items jsonb not null default '[]',
  shipping_address jsonb,
  billing_address jsonb,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_commerce_orders_shop on commerce_orders (shop_id, created_at desc);
create index idx_commerce_orders_customer on commerce_orders (customer_id);
create index idx_commerce_orders_status on commerce_orders (status);
create trigger trg_commerce_orders_updated before update on commerce_orders for each row execute function update_updated_at();

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  website text,
  lead_time_days integer,
  rating numeric(3, 2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_suppliers_updated before update on suppliers for each row execute function update_updated_at();
