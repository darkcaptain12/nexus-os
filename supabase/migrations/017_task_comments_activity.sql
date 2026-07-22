-- APEX OS — Migration 017: Task Comments & Activity Log

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id),
  content text not null,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_task_comments_task on task_comments (task_id, created_at) where deleted_at is null;
create trigger trg_task_comments_audit after insert or update or delete on task_comments for each row execute function audit_log_trigger();

create table task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index idx_task_activity_task on task_activity (task_id, created_at desc);

-- RLS
alter table task_comments enable row level security;
alter table task_activity enable row level security;

create policy "task_comments_via_task" on task_comments for all using (
  task_id in (select id from tasks where assignee_id = auth_user_id() or created_by = auth_user_id())
);

create policy "task_activity_via_task" on task_activity for all using (
  task_id in (select id from tasks where assignee_id = auth_user_id() or created_by = auth_user_id())
);
