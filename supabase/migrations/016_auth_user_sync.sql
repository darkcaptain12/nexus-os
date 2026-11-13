-- APEX OS — Migration 016: Auto-create user profile on Auth signup
-- Triggers when Supabase Auth creates a new user

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  new_user_id uuid;
begin
  set search_path = public;

  insert into public.users (auth_id, email, name, role, status, email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'owner',
    'active',
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (auth_id)
  do update set
    email = excluded.email,
    name = coalesce(nullif(excluded.name, ''), public.users.name),
    email_verified = coalesce(new.email_confirmed_at is not null, public.users.email_verified),
    updated_at = now()
  returning id into new_user_id;

  insert into public.user_profiles (user_id, timezone, locale, currency)
  values (new_user_id, 'Europe/Istanbul', 'tr-TR', 'TRY')
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id, theme, notifications_enabled)
  values (new_user_id, 'dark', true)
  on conflict (user_id) do nothing;

  return new;
exception when others then
  -- Auth akışını asla bozma: GoTrue (supabase_auth_admin) context'inde profil
  -- sync başarısız olsa bile signup/login devam eder (best-effort sync).
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Update users table when Auth email is confirmed or name changes
create or replace function handle_auth_user_updated()
returns trigger as $$
begin
  set search_path = public;

  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.users
    set email_verified = true, updated_at = now()
    where auth_id = new.id;
  end if;

  if new.raw_user_meta_data->>'name' is not null
     and new.raw_user_meta_data->>'name' != coalesce(old.raw_user_meta_data->>'name', '') then
    update public.users
    set name = new.raw_user_meta_data->>'name', updated_at = now()
    where auth_id = new.id;
  end if;

  return new;
exception when others then
  -- Auth login/update akışını asla bozma (best-effort sync).
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_updated
  after update on auth.users
  for each row execute function handle_auth_user_updated();

-- GoTrue rolü (supabase_auth_admin) profil senkron trigger'ları için public
-- şemaya erişebilmeli — yoksa auth signup/login "Database error" verir.
grant usage on schema public to supabase_auth_admin;
grant select, insert, update on public.users to supabase_auth_admin;
grant select, insert, update on public.user_profiles to supabase_auth_admin;
grant select, insert, update on public.user_preferences to supabase_auth_admin;
