-- AI KATALOG — database security and API tests.
-- Run with scripts/test-db.sh against a throwaway database that has the shim,
-- all migrations and seed.sql applied. Every test runs in a transaction that
-- is rolled back, so the order of blocks does not matter.

\set ON_ERROR_STOP 1
\set QUIET 1

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(p_condition boolean, p_name text)
returns void language plpgsql as $$
begin
  if p_condition is distinct from true then
    raise exception 'FAIL: %', p_name;
  end if;
  raise notice 'ok - %', p_name;
end;
$$;

-- Runs SQL and asserts that it raises the given SQLSTATE (or any error when null).
create or replace function tests.throws(p_sql text, p_sqlstate text, p_name text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_sqlstate is null or sqlstate = p_sqlstate then
      raise notice 'ok - %', p_name;
      return;
    end if;
    raise exception 'FAIL: % (expected %, got %: %)', p_name, p_sqlstate, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (no error raised)', p_name;
end;
$$;

-- Returns the number of rows affected by a data-modifying statement.
create or replace function tests.affected(p_sql text)
returns integer language plpgsql as $$
declare
  v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Test users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'visitor@example.test')
on conflict do nothing;
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-00000000000e', 'editor')
on conflict do nothing;

-- Publish two tools and one category relation for the tests below.
create or replace function tests.publish_fixture()
returns void language sql as $$
  update public.tools set status = 'published' where slug in ('chatgpt', 'claude');
$$;

-- ===========================================================================
-- 1. Anonymous visitors only see published content
-- ===========================================================================
begin;
set local role anon;
select tests.ok((select count(*) from public.tools) = 0, 'anon sees no unreviewed tools');
select tests.ok((public.api_home() ->> 'tool_count')::int = 0, 'home counts only published tools');
select tests.ok(public.api_tool('chatgpt') is null, 'unpublished tool profile is not available');
select tests.ok(public.api_tool('chatgpt', true) is null, 'anon cannot use preview mode');
select tests.ok((select count(*) from public.tool_categories) = 0, 'relations of unpublished tools are hidden');
select tests.ok((select count(*) from public.articles) = 0, 'unpublished articles are hidden');
select tests.ok((select count(*) from public.categories) = 11, 'published categories are visible');
rollback;

begin;
select tests.publish_fixture();
set local role anon;
select tests.ok((select count(*) from public.tools) = 2, 'anon sees published tools');
select tests.ok(public.api_tool('chatgpt') -> 'tool' ->> 'name' = 'ChatGPT', 'published tool profile loads');
select tests.ok(not (public.api_tool('chatgpt') -> 'tool' ? 'verification_notes'), 'internal verification notes are not exposed');
select tests.ok(jsonb_array_length(public.api_tool('chatgpt') -> 'related_tools') = 1, 'related tools only include published tools');
select tests.ok((public.api_search_tools(p_query := 'чат') ->> 'total')::int = 1, 'Cyrillic keyword prefix search finds ChatGPT');
select tests.ok((public.api_search_tools(p_query := 'clau') -> 'items' -> 0 ->> 'slug') = 'claude', 'Latin prefix search finds Claude');
select tests.ok((public.api_search_tools(p_query := '%') ->> 'total')::int = 0, 'LIKE wildcards are escaped');
select tests.ok((public.api_search_tools(p_query := 'a&|!(') ->> 'total') is not null, 'tsquery operators in input do not break search');
select tests.ok((public.api_search_tools(p_category := 'programiranje') ->> 'total')::int = 2, 'category filter includes secondary categories');
select tests.ok((public.api_search_tools(p_pricing := array['paid']) ->> 'total')::int = 0, 'pricing filter');
select tests.ok((public.api_search_tools(p_use_case := 'pishuvanje-kod', p_sort := 'name') -> 'items' -> 0 ->> 'slug') = 'chatgpt', 'use-case filter and alphabetical sort');
select tests.ok((public.api_search_tools(p_limit := 1, p_offset := 1) -> 'items' -> 0 ->> 'slug') is not null, 'pagination offset');
select tests.ok(
  (select (c ->> 'tool_count')::int from jsonb_array_elements(public.api_site() -> 'categories') c where c ->> 'slug' = 'video') = 0,
  'empty categories report zero tools');
select tests.ok(
  not exists (select 1 from jsonb_array_elements(public.api_sitemap() -> 'categories') c where c ->> 'slug' = 'video'),
  'empty categories are excluded from the sitemap');
rollback;

-- ===========================================================================
-- 2. Comparisons and collections need published tools
-- ===========================================================================
begin;
update public.comparisons set status = 'published';
update public.tools set status = 'published' where slug = 'chatgpt';
set local role anon;
select tests.ok(jsonb_array_length(public.api_comparisons()) = 0, 'comparison with fewer than two published tools is not listed');
reset role;
update public.tools set status = 'published' where slug in ('claude', 'google-gemini');
set local role anon;
select tests.ok(jsonb_array_length(public.api_comparisons()) = 1, 'complete comparison is listed');
select tests.ok(jsonb_array_length(public.api_comparison('chatgpt-claude-gemini') -> 'tools') = 3, 'comparison returns its tools');
rollback;

-- ===========================================================================
-- 3. Writes are denied to anonymous and ordinary authenticated users
-- ===========================================================================
begin;
set local role anon;
select tests.throws($$insert into public.tools (name, slug) values ('X', 'x')$$, '42501', 'anon cannot insert tools');
select tests.throws($$update public.categories set name = 'X'$$, '42501', 'anon cannot update categories');
select tests.throws($$select * from public.submissions$$, '42501', 'anon cannot read submissions');
select tests.throws($$select * from public.newsletter_subscribers$$, '42501', 'anon cannot read subscribers');
select tests.throws($$select * from private.rate_limits$$, '42501', 'anon cannot access the private schema');
select tests.throws($$select public.admin_dashboard()$$, '42501', 'anon cannot call admin functions');
select tests.throws($$select public.admin_save_tool('{"name":"X","slug":"x"}')$$, '42501', 'anon cannot save tools');
rollback;

begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select tests.ok(not public.is_staff(), 'ordinary user is not staff');
select tests.throws($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'admin')$$, '42501', 'user cannot self-assign a role');
select tests.throws($$update public.user_roles set role = 'admin'$$, '42501', 'user cannot change roles');
select tests.throws($$insert into public.tools (name, slug) values ('X', 'x')$$, '42501', 'ordinary user cannot insert tools (RLS)');
select tests.ok(tests.affected($$update public.tools set name = 'Hacked'$$) = 0, 'ordinary user updates zero tools');
select tests.ok(tests.affected($$delete from public.categories$$) = 0, 'ordinary user deletes zero categories');
select tests.throws($$select public.admin_save_tool('{"name":"X","slug":"x"}')$$, '42501', 'ordinary user cannot call admin_save_tool');
select tests.throws($$select public.admin_list('tools')$$, '42501', 'ordinary user cannot list drafts');
select tests.ok((select count(*) from public.submissions) = 0, 'ordinary user sees no submissions');
select tests.throws($$insert into public.site_settings (key, value) values ('contact_email', 'x@example.com')$$, '42501', 'ordinary user cannot add settings');
select tests.throws($$select public.admin_save_settings('{"contact_email":"x@example.com"}')$$, '42501', 'ordinary user cannot save settings');
rollback;

-- ===========================================================================
-- 4. Editors manage content; admins also delete and manage personal data
-- ===========================================================================
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated","email":"editor@example.test"}', true);
set local role authenticated;
select tests.ok(public.is_staff() and not public.is_admin(), 'editor is staff but not admin');
select tests.ok(public.admin_me() ->> 'role' = 'editor', 'admin_me reports role');
select tests.ok((public.admin_list('tools') ->> 'total')::int = 25, 'editor lists all tools');
select tests.ok(public.api_tool('chatgpt', true) is not null, 'editor can preview unpublished tool');
select tests.ok(public.api_tool('chatgpt') is null, 'preview is opt-in even for staff');

select public.admin_save_tool(jsonb_build_object(
  'name', 'Тест алатка', 'slug', 'test-alatka', 'short_description', 'Кратко објаснување за тест алатката.',
  'website_url', 'https://example.com', 'primary_category_id', (select id from public.categories where slug = 'video'),
  'category_ids', jsonb_build_array((select id from public.categories where slug = 'audio-i-glas')),
  'platforms', jsonb_build_array('web'), 'status', 'published',
  'features', jsonb_build_array(jsonb_build_object('feature_name', 'Титлови', 'feature_value', 'Да'))
));
select tests.ok((select count(*) from public.tool_categories tc join public.tools t on t.id = tc.tool_id where t.slug = 'test-alatka') = 2,
  'save keeps primary and secondary categories');
select tests.ok((select published_at is not null from public.tools where slug = 'test-alatka'), 'published_at is stamped');
select tests.ok((select count(*) from public.tool_features f join public.tools t on t.id = f.tool_id where t.slug = 'test-alatka') = 1, 'features are saved');

select public.admin_verify_tool((select id from public.tools where slug = 'test-alatka'), 'Проверено на официјалната страница.', null);
select tests.ok((select verification_status = 'verified' and last_verified_at is not null and verified_by = '00000000-0000-0000-0000-00000000000e'
  from public.tools where slug = 'test-alatka'), 'verification records date and reviewer');

select public.admin_save_tool((public.admin_get_tool((select id from public.tools where slug = 'test-alatka')) - 'history')
  || jsonb_build_object('pricing_type', 'paid'));
select tests.ok(exists (select 1 from public.tool_updates u join public.tools t on t.id = u.tool_id
  where t.slug = 'test-alatka' and u.field_changed = 'pricing_type' and u.new_value = 'paid'), 'pricing changes are logged');

select tests.throws($$select public.admin_save_tool('{"name":"Y","slug":"y","status":"published"}')$$, '23514', 'published tool needs minimum data');
select tests.throws($$select public.admin_save_tool('{"name":"Y","slug":"Bad Slug"}')$$, '23514', 'slug format is enforced');
select tests.throws($$select public.admin_save_tool('{"name":"Y","slug":"chatgpt"}')$$, '23505', 'duplicate slug is rejected');
select tests.throws($$select public.admin_save_tool('{"name":"Y","slug":"y","website_url":"javascript:alert(1)"}')$$, '23514', 'non-https URLs are rejected');
select tests.throws($$select public.admin_delete('tools', (select id from public.tools where slug = 'claude'))$$, '42501', 'editor cannot delete');
select tests.throws($$select public.admin_newsletter()$$, '42501', 'editor cannot read subscriber e-mails');
select tests.ok((select count(*) from public.newsletter_subscribers) = 0, 'editor sees no subscriber rows');
select tests.throws($$select public.admin_save_settings('{"contact_email":"x@example.com"}')$$, '42501', 'editor cannot change settings');
select tests.throws($$select public.admin_save_comparison('{"title":"Тест споредба","slug":"test","status":"published","introduction":"Доволно долг вовед за споредбата на две или повеќе алатки.","tools":[]}')$$,
  '23514', 'published comparison needs two tools');
rollback;

begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select tests.ok(public.is_admin(), 'admin is admin');
select public.admin_delete('tools', (select id from public.tools where slug = 'claude'));
select tests.ok(not exists (select 1 from public.tools where slug = 'claude'), 'admin can delete');
select public.admin_save_settings('{"contact_email":"redakcija@example.com"}');
select tests.ok(public.api_site() -> 'settings' ->> 'contact_email' = 'redakcija@example.com', 'admin can change settings');
select tests.throws($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000b', 'admin')$$, '42501', 'even admins cannot grant roles from the browser');
rollback;

-- ===========================================================================
-- 5. Visitor interactions: validation, honeypot, rate limits
-- ===========================================================================
begin;
set local role anon;
select tests.ok((public.submit_tool('Нова алатка', 'https://nova-alatka.example', 'Корисна за тест.', null, '', 5000) ->> 'status') = 'received', 'tool suggestion accepted');
select tests.ok((public.submit_tool('Нова алатка', 'https://www.nova-alatka.example/x', '', null, '', 5000) ->> 'status') = 'duplicate', 'duplicate suggestion detected');
select tests.ok((public.submit_tool('Спам', 'https://spam.example', '', null, 'filled', 5000) ->> 'ok')::boolean, 'honeypot responds normally');
select tests.ok((public.submit_tool('X', 'not a url', '', null, '', 5000) ->> 'error') = 'invalid_name', 'name validation');
select tests.ok((public.submit_tool('Име', 'ftp://x', '', null, '', 5000) ->> 'error') = 'invalid_url', 'url validation');
select tests.ok((public.submit_tool('Име', 'https://ok.example', '', 'not-an-email', '', 5000) ->> 'error') = 'invalid_email', 'email validation');
reset role;
select tests.ok((select count(*) from public.submissions) = 1, 'only the valid, non-spam suggestion was stored');
select tests.ok((select status = 'pending' from public.submissions limit 1), 'suggestions enter the moderation queue as pending');
set local role anon;
select public.submit_tool('Алатка ' || i, 'https://alatka-' || i || '.example', '', null, '', 5000) from generate_series(1, 3) i;
select tests.ok((public.submit_tool('Петта', 'https://five.example', '', null, '', 5000) ->> 'error') = 'rate_limited', 'per-client rate limit applies');
rollback;

begin;
set local role anon;
select tests.ok((public.newsletter_subscribe('ana@example.com', false) ->> 'error') = 'consent_required', 'newsletter requires explicit consent');
select tests.ok((public.newsletter_subscribe('bad', true) ->> 'error') = 'invalid_email', 'newsletter validates e-mail');
create temporary table t_token on commit drop as select public.newsletter_subscribe('Ana@Example.com', true) ->> 'token' as token;
select tests.ok((select token ~ '^[a-f0-9]{64}$' from t_token), 'subscription returns an unsubscribe token');
select tests.ok((public.newsletter_subscribe('ana@example.com', true) ->> 'token') is null, 'duplicate subscription issues no new token');
select tests.ok((public.newsletter_unsubscribe((select token from t_token)) ->> 'ok')::boolean, 'token unsubscribes');
select tests.ok((public.newsletter_unsubscribe(repeat('a', 64)) ->> 'ok')::boolean = false, 'unknown token is rejected');
reset role;
select tests.ok((select subscription_status = 'unsubscribed' and unsubscribe_token_hash !~ '^[a-f0-9]{64}$' is false
  from public.newsletter_subscribers), 'only the token hash is stored');
select tests.ok((select count(*) from public.newsletter_subscribers) = 1, 'e-mail stored once (case-insensitive)');
rollback;

begin;
select tests.publish_fixture();
set local role anon;
select public.track_event('tool_view', 'chatgpt');
select public.track_event('tool_view', 'chatgpt');
select public.track_event('not_allowed', 'x');
select public.track_event('search', 'Free Text With Spaces');
select public.track_outbound('chatgpt', 'tool_page');
select public.track_outbound('google-gemini', 'tool_page');
reset role;
select tests.ok((select count from public.analytics_daily where event = 'tool_view' and dimension = 'chatgpt') = 2, 'events aggregate into daily counters');
select tests.ok((select count(*) from public.analytics_daily) = 1, 'unknown events and free text are discarded');
select tests.ok((select sum(clicks) from public.outbound_clicks) = 1, 'outbound clicks only count published tools');
rollback;


-- ===========================================================================
-- 6. YouTube tutorials attached to tools
-- ===========================================================================
begin;
select tests.publish_fixture();
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);
set local role authenticated;
select public.admin_save_tool_video(jsonb_build_object('tool_id', (select id from public.tools where slug = 'chatgpt'),
  'youtube_id', 'dQw4w9WgXcQ', 'title', 'Вовед во ChatGPT', 'language', 'mk', 'source', 'manual'));
select public.admin_save_tool_video(jsonb_build_object('tool_id', (select id from public.tools where slug = 'chatgpt'),
  'youtube_id', 'abcdefghijk', 'title', 'Скриено видео', 'is_visible', false));
select public.admin_save_tool_video(jsonb_build_object('tool_id', (select id from public.tools where slug = 'midjourney'),
  'youtube_id', 'zzzzzzzzzzz', 'title', 'Видео за необјавена алатка'));
select tests.ok(jsonb_array_length(public.admin_tool_videos((select id from public.tools where slug = 'chatgpt'))) = 2, 'editor lists all videos of a tool');
select public.admin_save_tool_video(jsonb_build_object('tool_id', (select id from public.tools where slug = 'chatgpt'),
  'youtube_id', 'dQw4w9WgXcQ', 'title', 'Вовед во ChatGPT (ажурирано)', 'language', 'mk'));
select tests.ok((select count(*) from public.tool_videos where youtube_id = 'dQw4w9WgXcQ') = 1, 'the same video is not attached twice');
select tests.throws($$select public.admin_save_tool_video(jsonb_build_object('tool_id', (select id from public.tools where slug = 'chatgpt'), 'youtube_id', 'bad id<script>', 'title', 'x'))$$,
  '23514', 'invalid YouTube ids are rejected');
select public.admin_refresh_tool_videos((select id from public.tools where slug = 'chatgpt'),
  '[{"youtube_id":"dQw4w9WgXcQ","title":"Нов наслов","channel_title":"Канал","duration_seconds":"300"}]', array['abcdefghijk']);
select tests.ok((select title = 'Нов наслов' and duration_seconds = 300 and metadata_refreshed_at is not null from public.tool_videos where youtube_id = 'dQw4w9WgXcQ'),
  'refresh updates metadata');
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select tests.ok(jsonb_array_length(public.api_tool('chatgpt') -> 'videos') = 1, 'public profile shows only visible videos');
select tests.ok((select count(*) from public.tool_videos) = 1, 'anon cannot see hidden videos or videos of unpublished tools');
select tests.throws($$insert into public.tool_videos (tool_id, youtube_id, title) values ((select id from public.tools limit 1), 'aaaaaaaaaaa', 'x')$$, '42501', 'anon cannot add videos');
select tests.throws($$select public.admin_tool_videos((select id from public.tools limit 1))$$, '42501', 'anon cannot call video admin functions');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select tests.throws($$select public.admin_save_tool_video('{"youtube_id":"aaaaaaaaaaa","title":"x"}')$$, '42501', 'ordinary users cannot add videos');
select tests.ok(tests.affected($$delete from public.tool_videos$$) = 0, 'ordinary users cannot delete videos');
rollback;

\echo 'All database tests passed.'
