-- APEX OS — Migration 005: Goals, Projects, Tasks

create type goal_status as enum ('active', 'completed', 'abandoned', 'paused');
create type task_status as enum ('pending', 'in_progress', 'completed', 'cancelled', 'failed', 'blocked');

create table goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status goal_status not null default 'active',
  target_date timestamptz,
  progress numeric(5, 2) not null default 0 check (progress between 0 and 100),
  owner_id uuid not null references users(id),
  parent_id uuid references goals(id),
  priority priority_level not null default 'normal',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_goals_owner on goals (owner_id, status) where deleted_at is null;
create trigger trg_goals_updated before update on goals for each row execute function update_updated_at();

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status entity_status not null default 'active',
  goal_id uuid references goals(id),
  owner_id uuid not null references users(id),
  color text,
  icon text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_projects_owner on projects (owner_id) where deleted_at is null;
create trigger trg_projects_updated before update on projects for each row execute function update_updated_at();

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status not null default 'pending',
  priority priority_level not null default 'normal',
  project_id uuid references projects(id),
  goal_id uuid references goals(id),
  assignee_id uuid references users(id),
  agent_id uuid references agents(id),
  parent_id uuid references tasks(id),
  due_date timestamptz,
  completed_at timestamptz,
  estimated_minutes integer,
  actual_minutes integer,
  labels text[] not null default '{}',
  order_index integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid
);

create index idx_tasks_project on tasks (project_id, status) where deleted_at is null;
create index idx_tasks_assignee on tasks (assignee_id, status) where deleted_at is null;
create index idx_tasks_status on tasks (status) where deleted_at is null;
create index idx_tasks_due on tasks (due_date) where status not in ('completed', 'cancelled') and deleted_at is null;
create index idx_tasks_labels on tasks using gin (labels) where deleted_at is null;
create trigger trg_tasks_updated before update on tasks for each row execute function update_updated_at();

create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on uuid not null references tasks(id) on delete cascade,
  type text not null default 'blocks', -- 'blocks', 'informs', 'requires'
  created_at timestamptz not null default now(),
  unique(task_id, depends_on)
);
