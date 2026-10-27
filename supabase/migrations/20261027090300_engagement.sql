-- AI KATALOG — visitor interactions: tool suggestions, contact messages,
-- newsletter, aggregate analytics and rate limiting.
-- Visitors never write to these tables directly; they call validated,
-- rate-limited SECURITY DEFINER functions instead.

create type public.submission_status as enum ('pending', 'approved', 'rejected', 'spam');
create type public.subscription_status as enum ('subscribed', 'unsubscribed');

-- ---------------------------------------------------------------------------
-- Private schema (not exposed through the API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;

create table private.app_secrets (
  name text primary key,
  value text not null
);

insert into private.app_secrets (name, value)
values ('fingerprint_salt', encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'))
on conflict (name) do nothing;

create table private.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

-- A salted, daily-rotating hash of the client address. The address itself is
-- never stored, and the hash is only kept in rate_limits for ~2 days.
create or replace function private.client_fingerprint()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(sha256(convert_to(
    coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
      nullif(split_part(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ',', 1), ''),
      'unknown'
    )
    || '|' || current_date::text
    || '|' || (select s.value from private.app_secrets s where s.name = 'fingerprint_salt'),
    'UTF8'
  )), 'hex');
$$;

-- Returns true when the action is allowed. Applies a per-client limit and a
-- global ceiling (20x the per-client limit) for the same window.
create or replace function private.allow_action(p_action text, p_max integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01');
  v_client_hits integer;
  v_global_hits integer;
begin
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  insert into private.rate_limits (bucket, window_start, hits)
  values (p_action || ':' || private.client_fingerprint(), v_window, 1)
  on conflict (bucket, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_client_hits;

  insert into private.rate_limits (bucket, window_start, hits)
  values (p_action || ':*', v_window, 1)
  on conflict (bucket, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_global_hits;

  return v_client_hits <= p_max and v_global_hits <= p_max * 20;
end;
$$;

create or replace function private.is_valid_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_email is not null
    and char_length(p_email) between 6 and 254
    and p_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$';
$$;

create or replace function private.rate_limited()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('ok', false, 'error', 'rate_limited',
    'message', 'Испративте премногу барања. Обидете се повторно подоцна.');
$$;

-- ---------------------------------------------------------------------------
-- Tool suggestions (moderation queue)
-- ---------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  proposed_name text not null check (char_length(proposed_name) between 2 and 120),
  proposed_url text not null check (proposed_url ~ '^https?://[^\s]+$' and char_length(proposed_url) <= 300),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  submitter_email text check (submitter_email is null or char_length(submitter_email) <= 254),
  status public.submission_status not null default 'pending',
  moderator_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index submissions_status_idx on public.submissions (status, created_at desc);

create or replace function public.submit_tool(
  p_name text,
  p_url text,
  p_explanation text default '',
  p_email text default null,
  p_website text default '',
  p_elapsed_ms integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_url text := trim(coalesce(p_url, ''));
  v_expl text := trim(coalesce(p_explanation, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_host text;
  v_existing text;
begin
  -- Honeypot field or implausibly fast submission: accept silently, store nothing.
  if coalesce(p_website, '') <> '' or coalesce(p_elapsed_ms, 0) < 2500 then
    return jsonb_build_object('ok', true, 'status', 'received');
  end if;

  if char_length(v_name) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name', 'message', 'Името мора да има помеѓу 2 и 120 знаци.');
  end if;
  if v_url !~ '^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]+)?(/[^\s]*)?$' or char_length(v_url) > 300 then
    return jsonb_build_object('ok', false, 'error', 'invalid_url', 'message', 'Внесете валидна веб-адреса што почнува со https://');
  end if;
  if char_length(v_expl) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_explanation', 'message', 'Објаснувањето може да има најмногу 2000 знаци.');
  end if;
  if v_email is not null and not private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'invalid_email', 'message', 'Е-поштата не е валидна.');
  end if;

  if not private.allow_action('submit_tool', 5, interval '1 hour') then
    return private.rate_limited();
  end if;

  v_host := lower(regexp_replace(substring(v_url from '^https?://([^/:]+)'), '^www\.', ''));

  select t.slug into v_existing
  from public.tools t
  where t.status = 'published'
    and lower(regexp_replace(substring(t.website_url from '^https?://([^/:]+)'), '^www\.', '')) = v_host
  limit 1;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'status', 'exists', 'slug', v_existing);
  end if;

  if exists (
    select 1 from public.submissions s
    where s.status = 'pending'
      and lower(regexp_replace(substring(s.proposed_url from '^https?://([^/:]+)'), '^www\.', '')) = v_host
  ) then
    return jsonb_build_object('ok', true, 'status', 'duplicate');
  end if;

  insert into public.submissions (proposed_name, proposed_url, explanation, submitter_email)
  values (v_name, v_url, v_expl, v_email);

  return jsonb_build_object('ok', true, 'status', 'received');
end;
$$;

-- ---------------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  topic text not null default 'general' check (topic in ('general', 'correction', 'advertising', 'privacy')),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create or replace function public.send_contact_message(
  p_name text,
  p_email text,
  p_topic text,
  p_message text,
  p_website text default '',
  p_elapsed_ms integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_message text := trim(coalesce(p_message, ''));
  v_topic text := coalesce(nullif(p_topic, ''), 'general');
begin
  if coalesce(p_website, '') <> '' or coalesce(p_elapsed_ms, 0) < 2500 then
    return jsonb_build_object('ok', true);
  end if;
  if char_length(v_name) not between 2 and 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name', 'message', 'Името мора да има помеѓу 2 и 120 знаци.');
  end if;
  if not private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'invalid_email', 'message', 'Е-поштата не е валидна.');
  end if;
  if v_topic not in ('general', 'correction', 'advertising', 'privacy') then
    return jsonb_build_object('ok', false, 'error', 'invalid_topic', 'message', 'Изберете тема.');
  end if;
  if char_length(v_message) not between 10 and 4000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_message', 'message', 'Пораката мора да има помеѓу 10 и 4000 знаци.');
  end if;
  if not private.allow_action('contact', 3, interval '1 hour') then
    return private.rate_limited();
  end if;

  insert into public.contact_messages (name, email, topic, message)
  values (v_name, v_email, v_topic, v_message);
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Newsletter (explicit consent, duplicate-safe, token-based unsubscribe)
-- ---------------------------------------------------------------------------

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  consent_at timestamptz not null,
  consent_version text not null check (char_length(consent_version) <= 40),
  subscription_status public.subscription_status not null default 'subscribed',
  unsubscribe_token_hash text not null unique,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index newsletter_subscribers_email_idx on public.newsletter_subscribers (lower(email));
create trigger newsletter_subscribers_updated_at before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

create or replace function private.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

create or replace function public.newsletter_subscribe(
  p_email text,
  p_consent boolean,
  p_consent_version text default 'v1',
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_existing public.newsletter_subscribers;
begin
  if coalesce(p_website, '') <> '' then
    return jsonb_build_object('ok', true, 'token', null);
  end if;
  if p_consent is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'consent_required', 'message', 'Потребна е ваша изречна согласност.');
  end if;
  if not private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'invalid_email', 'message', 'Е-поштата не е валидна.');
  end if;
  if not private.allow_action('newsletter', 5, interval '1 hour') then
    return private.rate_limited();
  end if;

  select * into v_existing from public.newsletter_subscribers where lower(email) = v_email;

  if not found then
    insert into public.newsletter_subscribers (email, consent_at, consent_version, unsubscribe_token_hash)
    values (v_email, now(), left(coalesce(p_consent_version, 'v1'), 40), private.hash_token(v_token));
    return jsonb_build_object('ok', true, 'token', v_token);
  end if;

  if v_existing.subscription_status = 'unsubscribed' then
    update public.newsletter_subscribers
       set subscription_status = 'subscribed', consent_at = now(),
           consent_version = left(coalesce(p_consent_version, 'v1'), 40),
           unsubscribe_token_hash = private.hash_token(v_token), unsubscribed_at = null
     where id = v_existing.id;
    return jsonb_build_object('ok', true, 'token', v_token);
  end if;

  -- Already subscribed: no change, and no new token is issued.
  return jsonb_build_object('ok', true, 'token', null);
end;
$$;

create or replace function public.newsletter_unsubscribe(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'message', 'Линкот за одјава не е валиден.');
  end if;
  if not private.allow_action('unsubscribe', 20, interval '1 hour') then
    return private.rate_limited();
  end if;

  update public.newsletter_subscribers
     set subscription_status = 'unsubscribed', unsubscribed_at = now()
   where unsubscribe_token_hash = private.hash_token(p_token)
     and subscription_status = 'subscribed';
  get diagnostics v_count = row_count;

  if v_count = 0 and not exists (
    select 1 from public.newsletter_subscribers where unsubscribe_token_hash = private.hash_token(p_token)
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'message', 'Линкот за одјава не е валиден или е истечен.');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Aggregate analytics. Only daily counters are stored: no identifiers,
-- no IP addresses, no free-text search queries.
-- ---------------------------------------------------------------------------

create table public.outbound_clicks (
  tool_id uuid not null references public.tools (id) on delete cascade,
  day date not null,
  context text not null check (context in ('tool_page', 'card', 'comparison', 'collection', 'wizard', 'article')),
  clicks integer not null default 0,
  primary key (tool_id, day, context)
);
create index outbound_clicks_day_idx on public.outbound_clicks (day);

create table public.analytics_daily (
  day date not null,
  event text not null check (event in (
    'search', 'category_view', 'tool_view', 'comparison_view', 'article_view',
    'collection_view', 'recommendation_select', 'wizard_complete', 'newsletter_signup'
  )),
  dimension text not null default '' check (dimension ~ '^[a-z0-9_-]{0,80}$'),
  count integer not null default 0,
  primary key (day, event, dimension)
);

create or replace function public.track_outbound(p_tool_slug text, p_context text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tool_id uuid;
begin
  if p_context not in ('tool_page', 'card', 'comparison', 'collection', 'wizard', 'article') then
    return;
  end if;
  select id into v_tool_id from public.tools where slug = p_tool_slug and status = 'published';
  if v_tool_id is null or not private.allow_action('outbound', 60, interval '1 hour') then
    return;
  end if;

  insert into public.outbound_clicks (tool_id, day, context, clicks)
  values (v_tool_id, current_date, p_context, 1)
  on conflict (tool_id, day, context) do update set clicks = public.outbound_clicks.clicks + 1;
end;
$$;

create or replace function public.track_event(p_event text, p_dimension text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dimension text := left(lower(coalesce(p_dimension, '')), 80);
begin
  if p_event not in (
    'search', 'category_view', 'tool_view', 'comparison_view', 'article_view',
    'collection_view', 'recommendation_select', 'wizard_complete', 'newsletter_signup'
  ) or v_dimension !~ '^[a-z0-9_-]{0,80}$' then
    return;
  end if;
  if not private.allow_action('event', 300, interval '1 hour') then
    return;
  end if;

  insert into public.analytics_daily (day, event, dimension, count)
  values (current_date, p_event, v_dimension, 1)
  on conflict (day, event, dimension) do update set count = public.analytics_daily.count + 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on public.submissions, public.contact_messages, public.newsletter_subscribers,
  public.outbound_clicks, public.analytics_daily from anon, authenticated;

alter table public.submissions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.outbound_clicks enable row level security;
alter table public.analytics_daily enable row level security;

grant select, update on public.submissions to authenticated;
grant delete on public.submissions to authenticated;
create policy submissions_staff_read on public.submissions for select to authenticated using ((select public.is_staff()));
create policy submissions_staff_update on public.submissions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy submissions_admin_delete on public.submissions for delete to authenticated using ((select public.is_admin()));

grant select, update, delete on public.contact_messages to authenticated;
create policy contact_staff_read on public.contact_messages for select to authenticated using ((select public.is_staff()));
create policy contact_staff_update on public.contact_messages for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy contact_admin_delete on public.contact_messages for delete to authenticated using ((select public.is_admin()));

-- Subscriber e-mail addresses are visible to admins only.
grant select, update, delete on public.newsletter_subscribers to authenticated;
create policy newsletter_admin_read on public.newsletter_subscribers for select to authenticated using ((select public.is_admin()));
create policy newsletter_admin_update on public.newsletter_subscribers for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy newsletter_admin_delete on public.newsletter_subscribers for delete to authenticated using ((select public.is_admin()));

grant select on public.outbound_clicks, public.analytics_daily to authenticated;
create policy outbound_staff_read on public.outbound_clicks for select to authenticated using ((select public.is_staff()));
create policy analytics_staff_read on public.analytics_daily for select to authenticated using ((select public.is_staff()));

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.submit_tool(text, text, text, text, text, integer) from public;
revoke execute on function public.send_contact_message(text, text, text, text, text, integer) from public;
revoke execute on function public.newsletter_subscribe(text, boolean, text, text) from public;
revoke execute on function public.newsletter_unsubscribe(text) from public;
revoke execute on function public.track_outbound(text, text) from public;
revoke execute on function public.track_event(text, text) from public;

grant execute on function
  public.submit_tool(text, text, text, text, text, integer),
  public.send_contact_message(text, text, text, text, text, integer),
  public.newsletter_subscribe(text, boolean, text, text),
  public.newsletter_unsubscribe(text),
  public.track_outbound(text, text),
  public.track_event(text, text)
to anon, authenticated;
