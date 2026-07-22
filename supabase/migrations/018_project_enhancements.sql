-- APEX OS — Migration 018: Project Enhancements
-- Adds priority, dates, activity log, and extended status values

set search_path = public;

-- Extend entity_status enum with project-specific values
alter type entity_status add value if not exists 'planning';
alter type entity_status add value if not exists 'on_hold';
alter type entity_status add value if not exists 'completed';

-- Add columns to projects (no data loss, all nullable with defaults)
alter table projects add column if not exists priority priority_level not null default 'normal';
alter table projects add column if not exists start_date date;
alter table projects add column if not exists end_date date;
alter table projects add column if not exists created_by uuid;

create index if not exists idx_projects_status on projects (status) where deleted_at is null;
create index if not exists idx_projects_priority on projects (priority) where deleted_at is null;

-- Project activity log
create table project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index idx_project_activity_project on project_activity (project_id, created_at desc);

-- RLS
alter table project_activity enable row level security;
create policy "project_activity_via_project" on project_activity for all using (
  project_id in (select id from projects where owner_id = auth_user_id())
);
