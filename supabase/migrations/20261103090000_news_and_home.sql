-- AI KATALOG — AI news aggregator and the home page category boxes.
-- Headlines are read from the RSS/Atom feeds of news sites (e.g. IT.mk) by the
-- `fetch-news` Edge Function. Only the title, a short excerpt, the date and the
-- link are stored; readers are always sent to the original article.

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  site_url text not null check (site_url ~ '^https://[^\s]+$'),
  feed_url text not null unique check (feed_url ~ '^https?://[^\s]+$'),
  language text not null default 'mk' check (language in ('mk', 'en', 'other')),
  ai_filter boolean not null default true,
  is_active boolean not null default true,
  last_fetched_at timestamptz,
  last_status text check (last_status in ('ok', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.news_sources.ai_filter is 'true: keep only items that mention AI (for general tech sites).';
create trigger news_sources_updated_at before update on public.news_sources
  for each row execute function public.set_updated_at();

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.news_sources (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 300),
  url text not null unique check (url ~ '^https?://[^\s]+$' and char_length(url) <= 1000),
  summary text check (char_length(summary) <= 400),
  published_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index news_items_published_idx on public.news_items (published_at desc) where not is_hidden;
create index news_items_source_idx on public.news_items (source_id, published_at desc);

alter table public.news_sources enable row level security;
alter table public.news_items enable row level security;
revoke all on public.news_sources, public.news_items from anon, authenticated;
grant select on public.news_sources, public.news_items to anon, authenticated;
grant insert, update, delete on public.news_sources to authenticated;
grant update on public.news_items to authenticated;

create policy news_sources_read on public.news_sources for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy news_sources_staff_insert on public.news_sources for insert to authenticated with check ((select public.is_staff()));
create policy news_sources_staff_update on public.news_sources for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy news_sources_admin_delete on public.news_sources for delete to authenticated using ((select public.is_admin()));

create policy news_items_read on public.news_items for select to anon, authenticated
  using (
    (select public.is_staff())
    or (not is_hidden and exists (select 1 from public.news_sources s where s.id = source_id and s.is_active))
  );
create policy news_items_staff_update on public.news_items for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Public API
-- ---------------------------------------------------------------------------

create or replace function public.news_item_json(n public.news_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', n.id, 'title', n.title, 'url', n.url, 'summary', n.summary, 'published_at', n.published_at,
    'source', (select jsonb_build_object('id', s.id, 'name', s.name, 'site_url', s.site_url) from public.news_sources s where s.id = n.source_id)
  );
$$;

create or replace function public.api_news(p_source uuid default null, p_limit integer default 30, p_offset integer default 0)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with f as (
    select n.* from public.news_items n
    join public.news_sources s on s.id = n.source_id and s.is_active
    where not n.is_hidden and (p_source is null or n.source_id = p_source)
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'items', coalesce((
      select jsonb_agg(public.news_item_json(x) order by x.published_at desc nulls last)
      from (
        select * from f order by published_at desc nulls last
        limit least(greatest(coalesce(p_limit, 30), 1), 100) offset least(greatest(coalesce(p_offset, 0), 0), 5000)
      ) x
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'site_url', s.site_url) order by s.name)
      from public.news_sources s where s.is_active
    ), '[]'::jsonb)
  );
$$;

create or replace function public.api_home()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'tool_count', (select count(*) from public.tools t where t.status = 'published'),
    'featured_tools', coalesce((
      select jsonb_agg(public.tool_card(t) order by t.published_at desc)
      from (select * from public.tools where status = 'published' and is_featured order by published_at desc limit 6) t
    ), '[]'::jsonb),
    'recent_tools', coalesce((
      select jsonb_agg(public.tool_card(t) order by t.published_at desc)
      from (select * from public.tools where status = 'published' order by published_at desc limit 8) t
    ), '[]'::jsonb),
    'collections', coalesce((
      select jsonb_agg(public.collection_card(c) order by c.is_featured desc, c.published_at desc)
      from (
        select * from public.collections
        where status = 'published' and kind = 'topic' and public.collection_is_complete(id)
        order by is_featured desc, published_at desc limit 3
      ) c
    ), '[]'::jsonb),
    'articles', coalesce((
      select jsonb_agg(public.article_card(a) order by a.is_featured desc, a.published_at desc)
      from (select * from public.articles where status = 'published' order by is_featured desc, published_at desc limit 4) a
    ), '[]'::jsonb),
    'prompts', coalesce((
      select jsonb_agg(public.prompt_card(p) order by p.is_featured desc, p.published_at desc)
      from (select * from public.prompts where status = 'published' order by is_featured desc, published_at desc limit 6) p
    ), '[]'::jsonb),
    'learning_paths', coalesce((
      select jsonb_agg(public.learning_path_card(lp) order by lp.is_featured desc, lp.published_at desc)
      from (
        select * from public.learning_paths
        where status = 'published' and exists (select 1 from public.learning_path_steps s where s.path_id = learning_paths.id)
        order by is_featured desc, published_at desc limit 3
      ) lp
    ), '[]'::jsonb),
    'audience_collections', coalesce((
      select jsonb_agg(public.collection_card(c) order by c.published_at desc)
      from (
        select * from public.collections
        where status = 'published' and kind = 'audience' and public.collection_is_complete(id)
        order by published_at desc limit 8
      ) c
    ), '[]'::jsonb),
    'category_tools', coalesce((
      select jsonb_agg(x.obj order by x.sort_order, x.name)
      from (
        select c.sort_order, c.name, jsonb_build_object(
          'slug', c.slug, 'name', c.name, 'icon', c.icon, 'accent', c.accent, 'description', c.description,
          'tool_count', (select count(*) from public.tool_categories tc join public.tools t on t.id = tc.tool_id and t.status = 'published' where tc.category_id = c.id),
          'tools', coalesce((
            select jsonb_agg(public.tool_card(t) order by t.is_featured desc, t.published_at desc)
            from (
              select t.* from public.tools t join public.tool_categories tc on tc.tool_id = t.id
              where tc.category_id = c.id and t.status = 'published'
              order by t.is_featured desc, t.published_at desc limit 5
            ) t
          ), '[]'::jsonb)
        ) as obj
        from public.categories c
        where c.status = 'published' and exists (
          select 1 from public.tool_categories tc join public.tools t on t.id = tc.tool_id and t.status = 'published' where tc.category_id = c.id
        )
      ) x
    ), '[]'::jsonb),
    'news', coalesce((
      select jsonb_agg(public.news_item_json(n) order by n.published_at desc nulls last)
      from (
        select n.* from public.news_items n join public.news_sources s on s.id = n.source_id and s.is_active
        where not n.is_hidden order by n.published_at desc nulls last limit 6
      ) n
    ), '[]'::jsonb),
    'comparisons', coalesce((
      select jsonb_agg(public.comparison_card(c) order by c.is_featured desc, c.published_at desc)
      from (
        select * from public.comparisons
        where status = 'published' and public.comparison_is_complete(id)
        order by is_featured desc, published_at desc limit 4
      ) c
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Ingest (service role only: called by the fetch-news Edge Function)
-- ---------------------------------------------------------------------------

create or replace function public.ingest_news(p_source_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.news_items (source_id, title, url, summary, published_at)
  select p_source_id, left(trim(i ->> 'title'), 300), i ->> 'url', nullif(left(trim(coalesce(i ->> 'summary', '')), 400), ''),
    least(nullif(i ->> 'published_at', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i
  where char_length(trim(coalesce(i ->> 'title', ''))) >= 3
    and (i ->> 'url') ~ '^https?://[^\s]+$' and char_length(i ->> 'url') <= 1000
  on conflict (url) do nothing;
  get diagnostics v_count = row_count;

  update public.news_sources set last_fetched_at = now(), last_status = 'ok', last_error = null where id = p_source_id;
  -- Keep the table small: headlines older than a year are not useful.
  delete from public.news_items where source_id = p_source_id and published_at < now() - interval '365 days';
  return v_count;
end;
$$;

create or replace function public.record_news_error(p_source_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.news_sources set last_fetched_at = now(), last_status = 'error', last_error = left(p_error, 500) where id = p_source_id;
$$;

-- ---------------------------------------------------------------------------
-- Admin API
-- ---------------------------------------------------------------------------

create or replace function public.admin_news_sources()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(s) || jsonb_build_object('item_count', (select count(*) from public.news_items n where n.source_id = s.id)) order by s.name)
    from public.news_sources s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_news_source(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.news_sources;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.news_sources, p);
  if v_id is null then
    insert into public.news_sources (name, site_url, feed_url, language, ai_filter, is_active)
    values (trim(r.name), trim(r.site_url), trim(r.feed_url), coalesce(r.language, 'mk'), coalesce(r.ai_filter, true), coalesce(r.is_active, true))
    returning id into v_id;
  else
    update public.news_sources set name = trim(r.name), site_url = trim(r.site_url), feed_url = trim(r.feed_url),
      language = coalesce(r.language, language), ai_filter = coalesce(r.ai_filter, ai_filter), is_active = coalesce(r.is_active, is_active)
    where id = v_id;
    if not found then
      raise exception 'Изворот не е пронајден.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_news_items(p_query text default null, p_limit integer default 100)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(public.news_item_json(n) || jsonb_build_object('is_hidden', n.is_hidden) order by n.published_at desc nulls last)
    from (
      select * from public.news_items
      where nullif(trim(coalesce(p_query, '')), '') is null or title ilike '%' || public.escape_like(trim(p_query)) || '%'
      order by published_at desc nulls last
      limit least(greatest(coalesce(p_limit, 100), 1), 300)
    ) n
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_news_hidden(p_id uuid, p_hidden boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.news_items set is_hidden = p_hidden where id = p_id;
  if not found then
    raise exception 'Веста не е пронајдена.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_delete(p_entity text, p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform public.assert_admin();
  if p_entity not in ('tools', 'categories', 'use_cases', 'articles', 'comparisons', 'collections', 'submissions', 'contact_messages', 'prompts', 'glossary_terms', 'learning_paths', 'news_sources') then
    raise exception 'Непознат тип на содржина: %', p_entity using errcode = '22023';
  end if;
  execute format('delete from public.%I where id = $1', p_entity) using p_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Записот не е пронајден.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.news_item_json(public.news_items), public.api_news(uuid, integer, integer), public.api_home() to anon, authenticated;
grant execute on function public.admin_news_sources(), public.admin_save_news_source(jsonb), public.admin_news_items(text, integer),
  public.admin_set_news_hidden(uuid, boolean), public.admin_delete(text, uuid) to authenticated;
revoke execute on function public.ingest_news(uuid, jsonb), public.record_news_error(uuid, text) from anon, authenticated;
grant execute on function public.ingest_news(uuid, jsonb), public.record_news_error(uuid, text) to service_role;
