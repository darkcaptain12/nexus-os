-- APEX OS — Migration 015: SQL Functions and Views
set search_path = public, extensions;
-- === SEARCH FUNCTIONS ===

create or replace function search_memories(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_type memory_type default null
)
returns table (
  id uuid,
  content text,
  type memory_type,
  similarity float,
  importance numeric,
  created_at timestamptz
) as $$
  select
    m.id,
    m.content,
    m.type,
    1 - (me.embedding <=> query_embedding) as similarity,
    m.importance,
    m.created_at
  from memory_embeddings me
  join memories m on m.id = me.memory_id
  where m.deleted_at is null
    and (filter_type is null or m.type = filter_type)
    and 1 - (me.embedding <=> query_embedding) > match_threshold
  order by me.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

create or replace function search_documents(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  chunk_content text,
  chunk_index int,
  similarity float
) as $$
  select
    dc.id,
    d.id,
    d.title,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.deleted_at is null
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

create or replace function search_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_category text default null
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  confidence numeric,
  similarity float
) as $$
  select
    k.id,
    k.title,
    k.content,
    k.category,
    k.confidence,
    1 - (k.embedding <=> query_embedding) as similarity
  from knowledge k
  where k.deleted_at is null
    and k.embedding is not null
    and (filter_category is null or k.category = filter_category)
    and 1 - (k.embedding <=> query_embedding) > match_threshold
  order by k.embedding <=> query_embedding
  limit match_count;
$$ language sql stable;

-- Full-text + vector hybrid search
create or replace function hybrid_search_memories(
  search_text text,
  query_embedding extensions.vector(1536),
  text_weight float default 0.3,
  vector_weight float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  content text,
  type memory_type,
  combined_score float
) as $$
  select
    m.id,
    m.content,
    m.type,
    (text_weight * ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', search_text))
     + vector_weight * (1 - (me.embedding <=> query_embedding))) as combined_score
  from memories m
  join memory_embeddings me on me.memory_id = m.id
  where m.deleted_at is null
    and (
      to_tsvector('english', m.content) @@ plainto_tsquery('english', search_text)
      or 1 - (me.embedding <=> query_embedding) > 0.5
    )
  order by combined_score desc
  limit match_count;
$$ language sql stable;

-- === UTILITY FUNCTIONS ===

create or replace function cleanup_expired_memories()
returns integer as $$
declare
  deleted_count integer;
begin
  with deleted as (
    update memories
    set deleted_at = now(), status = 'deleted'
    where expires_at < now() and deleted_at is null
    returning id
  )
  select count(*) into deleted_count from deleted;
  return deleted_count;
end;
$$ language plpgsql;

create or replace function get_ai_cost_summary(
  p_user_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  total_cost numeric,
  total_tokens bigint,
  total_runs bigint,
  avg_cost_per_run numeric,
  by_provider jsonb,
  by_agent jsonb
) as $$
  select
    coalesce(sum(ar.cost), 0) as total_cost,
    coalesce(sum(ar.total_tokens)::bigint, 0) as total_tokens,
    count(*)::bigint as total_runs,
    coalesce(avg(ar.cost), 0) as avg_cost_per_run,
    coalesce(jsonb_object_agg(
      coalesce(ar.provider, 'unknown'),
      jsonb_build_object('cost', cost_by_provider, 'runs', runs_by_provider)
    ) filter (where ar.provider is not null), '{}') as by_provider,
    coalesce(jsonb_object_agg(
      a.name,
      jsonb_build_object('cost', cost_by_agent, 'runs', runs_by_agent)
    ) filter (where a.name is not null), '{}') as by_agent
  from agent_runs ar
  left join agents a on a.id = ar.agent_id
  left join lateral (
    select sum(ar2.cost) as cost_by_provider, count(*) as runs_by_provider
    from agent_runs ar2
    where ar2.provider = ar.provider and ar2.user_id = p_user_id
      and ar2.created_at between p_from and p_to
  ) provider_stats on true
  left join lateral (
    select sum(ar3.cost) as cost_by_agent, count(*) as runs_by_agent
    from agent_runs ar3
    where ar3.agent_id = ar.agent_id and ar3.user_id = p_user_id
      and ar3.created_at between p_from and p_to
  ) agent_stats on true
  where ar.user_id = p_user_id
    and ar.created_at between p_from and p_to;
$$ language sql stable;

-- === VIEWS ===

create or replace view v_dashboard_summary as
select
  u.id as user_id,
  (select count(*) from tasks t where t.assignee_id = u.id and t.status = 'pending' and t.deleted_at is null) as pending_tasks,
  (select count(*) from tasks t where t.assignee_id = u.id and t.status = 'in_progress' and t.deleted_at is null) as active_tasks,
  (select count(*) from goals g where g.owner_id = u.id and g.status = 'active' and g.deleted_at is null) as active_goals,
  (select count(*) from notifications n where n.user_id = u.id and n.read = false and n.deleted_at is null) as unread_notifications,
  (select count(*) from agent_runs ar where ar.user_id = u.id and ar.status in ('pending', 'running')) as active_agent_runs,
  (select count(*) from positions p join portfolios pf on pf.id = p.portfolio_id where pf.owner_id = u.id and p.status = 'open') as open_positions
from users u
where u.deleted_at is null;

create or replace view v_agent_performance as
select
  a.id as agent_id,
  a.name,
  a.type,
  count(ar.id) as total_runs,
  count(ar.id) filter (where ar.status = 'completed') as successful_runs,
  count(ar.id) filter (where ar.status = 'failed') as failed_runs,
  round(avg(ar.latency_ms)) as avg_latency_ms,
  sum(ar.total_tokens) as total_tokens,
  sum(ar.cost) as total_cost,
  round(100.0 * count(ar.id) filter (where ar.status = 'completed') / nullif(count(ar.id), 0), 2) as success_rate
from agents a
left join agent_runs ar on ar.agent_id = a.id
where a.deleted_at is null
group by a.id, a.name, a.type;

create or replace view v_memory_stats as
select
  m.owner_id as user_id,
  m.type,
  count(*) as total_memories,
  avg(m.importance) as avg_importance,
  sum(m.access_count) as total_accesses,
  count(*) filter (where m.expires_at is not null and m.expires_at < now()) as expired_count
from memories m
where m.deleted_at is null
group by m.owner_id, m.type;

create or replace view v_trading_overview as
select
  pf.owner_id as user_id,
  pf.id as portfolio_id,
  pf.name as portfolio_name,
  pf.balance,
  pf.currency,
  count(p.id) filter (where p.status = 'open') as open_positions,
  sum(p.pnl) filter (where p.status = 'open') as unrealized_pnl,
  sum(p.pnl) filter (where p.status = 'closed') as realized_pnl,
  count(p.id) filter (where p.status = 'closed' and p.pnl > 0) as winning_trades,
  count(p.id) filter (where p.status = 'closed' and p.pnl <= 0) as losing_trades
from portfolios pf
left join positions p on p.portfolio_id = pf.id
group by pf.owner_id, pf.id, pf.name, pf.balance, pf.currency;

create or replace view v_commerce_overview as
select
  s.owner_id as user_id,
  s.id as shop_id,
  s.name as shop_name,
  s.platform,
  count(distinct p.id) as product_count,
  count(distinct c.id) as customer_count,
  count(distinct o.id) as total_orders,
  sum(o.total) as total_revenue,
  avg(o.total) as avg_order_value
from shops s
left join products p on p.shop_id = s.id and p.deleted_at is null
left join customers c on c.shop_id = s.id
left join commerce_orders o on o.shop_id = s.id
where s.deleted_at is null
group by s.owner_id, s.id, s.name, s.platform;

-- === STORAGE BUCKETS ===

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('screenshots', 'screenshots', false),
  ('voice', 'voice', false),
  ('exports', 'exports', false),
  ('backups', 'backups', false),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage policies
create policy "avatar_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar_user_write" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "private_user_access" on storage.objects for all using (
  bucket_id in ('documents', 'screenshots', 'voice', 'exports', 'attachments')
  and (storage.foldername(name))[1] = auth.uid()::text
);
