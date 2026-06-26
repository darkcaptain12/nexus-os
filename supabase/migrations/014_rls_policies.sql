-- APEX OS — Migration 014: Row Level Security Policies
-- Pattern: Users see own data. Agents see data they're authorized for. Service role bypasses.

-- Enable RLS on all tables
alter table users enable row level security;
alter table user_profiles enable row level security;
alter table user_preferences enable row level security;
alter table user_devices enable row level security;
alter table user_sessions enable row level security;
alter table api_keys enable row level security;
alter table agents enable row level security;
alter table agent_runs enable row level security;
alter table agent_tool_calls enable row level security;
alter table agent_metrics enable row level security;
alter table memories enable row level security;
alter table memory_embeddings enable row level security;
alter table memory_chunks enable row level security;
alter table memory_links enable row level security;
alter table memory_access_log enable row level security;
alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table knowledge enable row level security;
alter table goals enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table workflows enable row level security;
alter table workflow_runs enable row level security;
alter table notifications enable row level security;
alter table exchanges enable row level security;
alter table portfolios enable row level security;
alter table positions enable row level security;
alter table trade_orders enable row level security;
alter table trade_signals enable row level security;
alter table trade_strategies enable row level security;
alter table risk_profiles enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table commerce_orders enable row level security;
alter table financial_transactions enable row level security;
alter table budgets enable row level security;
alter table subscriptions enable row level security;
alter table calendar_events enable row level security;
alter table reminders enable row level security;
alter table health_metrics enable row level security;
alter table notes enable row level security;
alter table collections enable row level security;
alter table attachments enable row level security;
alter table automations enable row level security;
alter table automation_executions enable row level security;
alter table desktop_activity_logs enable row level security;
alter table clipboard_history enable row level security;
alter table screenshots enable row level security;
alter table file_index enable row level security;
alter table browser_history enable row level security;
alter table bookmarks enable row level security;
alter table voice_sessions enable row level security;
alter table voice_commands enable row level security;
alter table login_history enable row level security;
alter table audit_logs enable row level security;
alter table security_events enable row level security;
alter table api_logs enable row level security;

-- Helper: get current user ID from JWT
create or replace function auth_user_id()
returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', ''),
    nullif(current_setting('app.current_user_id', true), '')
  )::uuid;
$$ language sql stable;

-- === USER POLICIES (owner sees own data) ===

create policy "users_own" on users for all using (id = auth_user_id());
create policy "profiles_own" on user_profiles for all using (user_id = auth_user_id());
create policy "preferences_own" on user_preferences for all using (user_id = auth_user_id());
create policy "devices_own" on user_devices for all using (user_id = auth_user_id());
create policy "sessions_own" on user_sessions for all using (user_id = auth_user_id());
create policy "api_keys_own" on api_keys for all using (user_id = auth_user_id());

-- === AI POLICIES ===

create policy "agents_own" on agents for all using (owner_id = auth_user_id() or owner_id is null);
create policy "agent_runs_own" on agent_runs for all using (user_id = auth_user_id());
create policy "agent_tool_calls_via_run" on agent_tool_calls for select using (
  run_id in (select id from agent_runs where user_id = auth_user_id())
);

-- === MEMORY POLICIES ===

create policy "memories_own" on memories for all using (owner_id = auth_user_id());
create policy "memory_embeddings_via_memory" on memory_embeddings for select using (
  memory_id in (select id from memories where owner_id = auth_user_id())
);
create policy "conversations_own" on conversations for all using (user_id = auth_user_id());
create policy "conv_messages_via_conv" on conversation_messages for all using (
  conversation_id in (select id from conversations where user_id = auth_user_id())
);
create policy "documents_own" on documents for all using (owner_id = auth_user_id());
create policy "knowledge_own" on knowledge for all using (owner_id = auth_user_id());

-- === GOAL/TASK POLICIES ===

create policy "goals_own" on goals for all using (owner_id = auth_user_id());
create policy "projects_own" on projects for all using (owner_id = auth_user_id());
create policy "tasks_own" on tasks for all using (
  assignee_id = auth_user_id() or created_by = auth_user_id()
);

-- === WORKFLOW POLICIES ===

create policy "workflows_own" on workflows for all using (owner_id = auth_user_id());
create policy "workflow_runs_own" on workflow_runs for all using (user_id = auth_user_id());

-- === NOTIFICATION POLICIES ===

create policy "notifications_own" on notifications for all using (user_id = auth_user_id());

-- === TRADING POLICIES ===

create policy "exchanges_own" on exchanges for all using (owner_id = auth_user_id());
create policy "portfolios_own" on portfolios for all using (owner_id = auth_user_id());
create policy "positions_via_portfolio" on positions for all using (
  portfolio_id in (select id from portfolios where owner_id = auth_user_id())
);
create policy "trade_orders_via_portfolio" on trade_orders for all using (
  portfolio_id in (select id from portfolios where owner_id = auth_user_id())
);
create policy "strategies_own" on trade_strategies for all using (owner_id = auth_user_id());

-- === COMMERCE POLICIES ===

create policy "shops_own" on shops for all using (owner_id = auth_user_id());
create policy "products_via_shop" on products for all using (
  shop_id in (select id from shops where owner_id = auth_user_id())
);
create policy "customers_via_shop" on customers for all using (
  shop_id in (select id from shops where owner_id = auth_user_id())
);
create policy "commerce_orders_via_shop" on commerce_orders for all using (
  shop_id in (select id from shops where owner_id = auth_user_id())
);

-- === FINANCE/CALENDAR/HEALTH POLICIES ===

create policy "fin_transactions_own" on financial_transactions for all using (owner_id = auth_user_id());
create policy "budgets_own" on budgets for all using (owner_id = auth_user_id());
create policy "subscriptions_own" on subscriptions for all using (owner_id = auth_user_id());
create policy "calendar_own" on calendar_events for all using (owner_id = auth_user_id());
create policy "reminders_own" on reminders for all using (owner_id = auth_user_id());
create policy "health_own" on health_metrics for all using (user_id = auth_user_id());

-- === KNOWLEDGE BASE POLICIES ===

create policy "notes_own" on notes for all using (owner_id = auth_user_id());
create policy "collections_own" on collections for all using (owner_id = auth_user_id());
create policy "attachments_own" on attachments for all using (owner_id = auth_user_id());

-- === AUTOMATION POLICIES ===

create policy "automations_own" on automations for all using (owner_id = auth_user_id());

-- === DESKTOP/BROWSER POLICIES ===

create policy "desktop_activity_own" on desktop_activity_logs for all using (user_id = auth_user_id());
create policy "clipboard_own" on clipboard_history for all using (user_id = auth_user_id());
create policy "screenshots_own" on screenshots for all using (user_id = auth_user_id());
create policy "file_index_own" on file_index for all using (user_id = auth_user_id());
create policy "browser_history_own" on browser_history for all using (user_id = auth_user_id());
create policy "bookmarks_own" on bookmarks for all using (user_id = auth_user_id());

-- === VOICE POLICIES ===

create policy "voice_sessions_own" on voice_sessions for all using (user_id = auth_user_id());

-- === AUDIT POLICIES (read-only for user) ===

create policy "login_history_own" on login_history for select using (user_id = auth_user_id());
create policy "audit_logs_admin" on audit_logs for select using (
  performed_by = auth_user_id()::text
);
create policy "security_events_own" on security_events for select using (user_id = auth_user_id());
create policy "api_logs_own" on api_logs for select using (user_id = auth_user_id());
