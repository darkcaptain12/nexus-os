-- APEX OS — Migration 001: Extensions and Base Infrastructure
-- Enables required PostgreSQL extensions and creates shared utilities

-- Extensions
create extension if not exists "uuid-ossp" schema extensions;
create extension if not exists "pgcrypto" schema extensions;
create extension if not exists "vector" schema extensions;
create extension if not exists "pg_trgm" schema extensions;

-- Custom types
create type user_role as enum ('owner', 'admin', 'member', 'viewer', 'agent', 'system');
create type entity_status as enum ('active', 'inactive', 'archived', 'deleted');
create type priority_level as enum ('critical', 'high', 'normal', 'low', 'background');
create type execution_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout');

-- Shared function: auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Shared function: soft delete (set deleted_at instead of removing)
create or replace function soft_delete()
returns trigger as $$
begin
  new.deleted_at = now();
  new.status = 'deleted';
  return new;
end;
$$ language plpgsql;

-- Shared function: generate audit log entry
create or replace function audit_log_trigger()
returns trigger as $$
begin
  insert into audit_logs (
    table_name, record_id, action, old_data, new_data, performed_by
  ) values (
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    coalesce(current_setting('app.current_user_id', true), 'system')
  );
  return coalesce(new, old);
end;
$$ language plpgsql;
