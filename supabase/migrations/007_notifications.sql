-- APEX OS — Migration 007: Notifications

create type notification_channel as enum ('push', 'email', 'sms', 'desktop', 'webhook', 'in_app');
create type notification_priority as enum ('low', 'normal', 'high', 'urgent');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  channel notification_channel not null default 'in_app',
  priority notification_priority not null default 'normal',
  title text not null,
  body text not null,
  action_url text,
  read boolean not null default false,
  read_at timestamptz,
  source text, -- 'agent', 'workflow', 'system', 'trade', etc.
  source_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_notifications_user on notifications (user_id, created_at desc) where deleted_at is null;
create index idx_notifications_unread on notifications (user_id) where read = false and deleted_at is null;

create table notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  channel notification_channel not null,
  enabled boolean not null default true,
  config jsonb not null default '{}', -- provider keys, endpoints, etc.
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, channel)
);

create trigger trg_notification_channels_updated before update on notification_channels for each row execute function update_updated_at();

create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  channel notification_channel not null,
  subject text,
  body_template text not null,
  variables text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_notification_templates_updated before update on notification_templates for each row execute function update_updated_at();

create table notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  channel notification_channel not null,
  status text not null, -- 'sent', 'delivered', 'failed', 'bounced'
  provider text,
  provider_message_id text,
  error text,
  attempts integer not null default 1,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notification_delivery_notif on notification_delivery_log (notification_id);
