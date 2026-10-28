-- AI KATALOG — YouTube tutorials attached to tools.
-- Editors attach videos by link or pick them from YouTube search results
-- (Edge Function `youtube`, API key kept server-side). Nothing found through the
-- API is attached automatically: every video is added by a person.
-- YouTube API data (titles, channels) is refreshed through the same function;
-- see docs/YOUTUBE.md for the retention rules of the YouTube API Services.

create table public.tool_videos (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools (id) on delete cascade,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (char_length(title) between 1 and 200),
  channel_title text check (char_length(channel_title) <= 120),
  channel_id text check (channel_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  language text not null default 'en' check (language in ('mk', 'regional', 'en', 'other')),
  duration_seconds integer check (duration_seconds >= 0),
  video_published_at timestamptz,
  note text check (char_length(note) <= 300),
  is_visible boolean not null default true,
  position integer not null default 0,
  source text not null default 'manual' check (source in ('manual', 'youtube_search')),
  metadata_refreshed_at timestamptz,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool_id, youtube_id)
);

comment on column public.tool_videos.language is 'mk = на македонски, regional = српски/хрватски/бугарски, en = англиски.';

create index tool_videos_tool_idx on public.tool_videos (tool_id, position) where is_visible;
create trigger tool_videos_updated_at before update on public.tool_videos
  for each row execute function public.set_updated_at();

alter table public.tool_videos enable row level security;
revoke all on public.tool_videos from anon, authenticated;
grant select on public.tool_videos to anon, authenticated;
grant insert, update, delete on public.tool_videos to authenticated;

create policy tool_videos_read on public.tool_videos for select to anon, authenticated
  using (
    (select public.is_staff())
    or (is_visible and exists (select 1 from public.tools t where t.id = tool_id and t.status = 'published'))
  );
create policy tool_videos_staff_insert on public.tool_videos for insert to authenticated
  with check ((select public.is_staff()));
create policy tool_videos_staff_update on public.tool_videos for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy tool_videos_staff_delete on public.tool_videos for delete to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------
-- Public API: tool profile now includes its visible videos.
-- ---------------------------------------------------------------------------

create or replace function public.api_tool(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  t public.tools;
begin
  select * into t from public.tools x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'tool', to_jsonb(t) - 'search_vector' - 'verified_by' - 'verification_notes',
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'name', c.name, 'accent', c.accent, 'icon', c.icon, 'is_primary', c.id = t.primary_category_id)
        order by (c.id = t.primary_category_id) desc, c.sort_order)
      from public.tool_categories tc
      join public.categories c on c.id = tc.category_id and c.status = 'published'
      where tc.tool_id = t.id
    ), '[]'::jsonb),
    'use_cases', coalesce((
      select jsonb_agg(jsonb_build_object('slug', u.slug, 'name', u.name) order by u.sort_order)
      from public.tool_use_cases tu
      join public.use_cases u on u.id = tu.use_case_id and u.status = 'published'
      where tu.tool_id = t.id
    ), '[]'::jsonb),
    'features', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'feature_name', f.feature_name, 'feature_value', f.feature_value, 'verified_at', f.verified_at
      ) order by f.sort_order, f.feature_name)
      from public.tool_features f
      where f.tool_id = t.id
    ), '[]'::jsonb),
    'related_tools', coalesce((
      select jsonb_agg(public.tool_card(r.o) order by r.score desc, (r.o).is_featured desc, (r.o).name)
      from (
        select o, (
          (select count(*) from public.tool_categories a
             join public.tool_categories b on b.category_id = a.category_id
           where a.tool_id = t.id and b.tool_id = o.id) * 2
          + (select count(*) from public.tool_use_cases a
             join public.tool_use_cases b on b.use_case_id = a.use_case_id
           where a.tool_id = t.id and b.tool_id = o.id)
        ) as score
        from public.tools o
        where o.status = 'published' and o.id <> t.id
        order by score desc, o.is_featured desc, o.name
        limit 4
      ) r
      where r.score > 0
    ), '[]'::jsonb),
    'articles', coalesce((
      select jsonb_agg(public.article_card(a) order by a.published_at desc)
      from (
        select a.* from public.articles a
        join public.article_tools at on at.article_id = a.id and at.tool_id = t.id
        where a.status = 'published'
        order by a.published_at desc limit 4
      ) a
    ), '[]'::jsonb),
    'comparisons', coalesce((
      select jsonb_agg(public.comparison_card(c) order by c.published_at desc)
      from (
        select c.* from public.comparisons c
        join public.comparison_tools ct on ct.comparison_id = c.id and ct.tool_id = t.id
        where c.status = 'published' and public.comparison_is_complete(c.id)
        order by c.published_at desc limit 4
      ) c
    ), '[]'::jsonb),
    'collections', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'title', c.title) order by c.published_at desc)
      from (
        select c.* from public.collections c
        join public.collection_tools ct on ct.collection_id = c.id and ct.tool_id = t.id
        where c.status = 'published'
        order by c.published_at desc limit 4
      ) c
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id, 'youtube_id', v.youtube_id, 'title', v.title, 'channel_title', v.channel_title,
        'language', v.language, 'duration_seconds', v.duration_seconds, 'note', v.note,
        'video_published_at', v.video_published_at
      ) order by v.position, v.created_at)
      from public.tool_videos v
      where v.tool_id = t.id and v.is_visible
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin API
-- ---------------------------------------------------------------------------

create or replace function public.admin_tool_videos(p_tool_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(v) order by v.position, v.created_at)
    from public.tool_videos v where v.tool_id = p_tool_id
  ), '[]'::jsonb);
end;
$$;

-- Adds a video (or updates it when the same video is already attached).
create or replace function public.admin_save_tool_video(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  r public.tool_videos;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.tool_videos, p - 'id' - 'created_at' - 'updated_at' - 'added_by');

  insert into public.tool_videos (
    tool_id, youtube_id, title, channel_title, channel_id, language, duration_seconds,
    video_published_at, note, is_visible, position, source, metadata_refreshed_at, added_by
  ) values (
    r.tool_id, r.youtube_id, trim(r.title), nullif(trim(coalesce(r.channel_title, '')), ''), nullif(r.channel_id, ''),
    coalesce(r.language, 'en'), r.duration_seconds, r.video_published_at,
    nullif(trim(coalesce(r.note, '')), ''), coalesce(r.is_visible, true),
    coalesce(r.position, (select coalesce(max(position), 0) + 1 from public.tool_videos where tool_id = r.tool_id)),
    coalesce(r.source, 'manual'), r.metadata_refreshed_at, auth.uid()
  )
  on conflict (tool_id, youtube_id) do update set
    title = excluded.title,
    channel_title = coalesce(excluded.channel_title, public.tool_videos.channel_title),
    channel_id = coalesce(excluded.channel_id, public.tool_videos.channel_id),
    language = excluded.language,
    duration_seconds = coalesce(excluded.duration_seconds, public.tool_videos.duration_seconds),
    video_published_at = coalesce(excluded.video_published_at, public.tool_videos.video_published_at),
    note = excluded.note,
    is_visible = excluded.is_visible,
    metadata_refreshed_at = coalesce(excluded.metadata_refreshed_at, public.tool_videos.metadata_refreshed_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_reorder_tool_videos(p_tool_id uuid, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.tool_videos v set position = x.i
  from unnest(p_ids) with ordinality as x(id, i)
  where v.id = x.id and v.tool_id = p_tool_id;
end;
$$;

create or replace function public.admin_delete_tool_video(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  delete from public.tool_videos where id = p_id;
  if not found then
    raise exception 'Видеото не е пронајдено.' using errcode = 'P0002';
  end if;
end;
$$;

-- Applies a metadata refresh from the YouTube API. Videos that YouTube no
-- longer returns (deleted, private, blocked) are hidden, never silently kept.
create or replace function public.admin_refresh_tool_videos(p_tool_id uuid, p_found jsonb, p_missing text[])
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer;
  v_hidden integer;
begin
  perform public.assert_staff();

  update public.tool_videos v set
    title = left(f ->> 'title', 200),
    channel_title = left(f ->> 'channel_title', 120),
    duration_seconds = nullif(f ->> 'duration_seconds', '')::integer,
    metadata_refreshed_at = now()
  from jsonb_array_elements(coalesce(p_found, '[]'::jsonb)) f
  where v.tool_id = p_tool_id and v.youtube_id = f ->> 'youtube_id';
  get diagnostics v_updated = row_count;

  update public.tool_videos set
    is_visible = false,
    note = left('Недостапно на YouTube (проверено ' || to_char(now(), 'DD.MM.YYYY') || ')', 300),
    metadata_refreshed_at = now()
  where tool_id = p_tool_id and youtube_id = any (coalesce(p_missing, '{}')) and is_visible;
  get diagnostics v_hidden = row_count;

  return jsonb_build_object('updated', v_updated, 'hidden', v_hidden);
end;
$$;

revoke execute on function
  public.admin_tool_videos(uuid), public.admin_save_tool_video(jsonb),
  public.admin_reorder_tool_videos(uuid, uuid[]), public.admin_delete_tool_video(uuid),
  public.admin_refresh_tool_videos(uuid, jsonb, text[])
from public, anon;
grant execute on function
  public.admin_tool_videos(uuid), public.admin_save_tool_video(jsonb),
  public.admin_reorder_tool_videos(uuid, uuid[]), public.admin_delete_tool_video(uuid),
  public.admin_refresh_tool_videos(uuid, jsonb, text[])
to authenticated;
