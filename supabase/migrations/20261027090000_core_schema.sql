-- AI KATALOG — core content schema
-- Tools, categories, use cases, editorial content and the staff role model.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Controlled vocabularies
-- ---------------------------------------------------------------------------

create type public.content_status as enum ('draft', 'needs_review', 'published', 'archived');
create type public.pricing_type as enum ('free', 'freemium', 'paid', 'free_trial', 'open_source', 'unknown');
create type public.verification_status as enum ('unverified', 'verified', 'needs_update');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');
create type public.language_support as enum ('yes', 'partial', 'no', 'unknown');
create type public.staff_role as enum ('admin', 'editor');

-- ---------------------------------------------------------------------------
-- Staff roles. Rows can only be written by the service role / SQL editor,
-- never by an authenticated browser session (see security migration).
-- ---------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  );
$$;

create or replace function public.assert_staff()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Немате овластување за оваа операција.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Оваа операција бара администраторска улога.' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps published_at the first time a record is published.
create or replace function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories and use cases
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 300),
  intro text not null default '',
  icon text check (icon is null or icon ~ '^[a-z0-9-]{1,40}$'),
  accent text check (accent in ('tomato', 'mustard', 'teal', 'raspberry', 'ink')),
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_status_sort_idx on public.categories (status, sort_order);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.use_cases (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  task_label text not null check (char_length(task_label) between 2 and 120),
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.use_cases.task_label is 'Wording used by the discovery wizard, e.g. „Да напишам или уредам текст“.';

create index use_cases_status_sort_idx on public.use_cases (status, sort_order);
create trigger use_cases_updated_at before update on public.use_cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tools
-- ---------------------------------------------------------------------------

create table public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '' check (char_length(short_description) <= 280),
  description text not null default '',
  website_url text check (website_url ~ '^https://[^\s]+$'),
  logo_url text check (logo_url ~ '^https://[^\s]+$'),
  developer text check (char_length(developer) <= 120),
  primary_category_id uuid references public.categories (id) on delete set null,

  pricing_type public.pricing_type not null default 'unknown',
  starting_price numeric(10, 2) check (starting_price >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  price_period text check (price_period in ('month', 'year', 'one_time', 'usage')),
  has_free_plan boolean,
  free_plan_limits text,
  pricing_notes text,

  platforms text[] not null default '{}' check (
    platforms <@ array['web', 'windows', 'macos', 'linux', 'ios', 'android', 'api', 'browser_extension']::text[]
  ),
  capabilities text[] not null default '{}' check (
    capabilities <@ array['api_access', 'integrations', 'team_collaboration', 'file_upload', 'export', 'open_source', 'offline', 'commercial_use']::text[]
  ),
  macedonian_support public.language_support not null default 'unknown',
  skill_level public.skill_level,
  best_for text,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  editorial_verdict text,
  keywords text[] not null default '{}',

  verification_status public.verification_status not null default 'unverified',
  verification_notes text,
  last_verified_at timestamptz,
  next_review_at date,
  verified_by uuid references auth.users (id) on delete set null,

  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  is_sponsored boolean not null default false,
  sponsor_note text,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),

  search_vector tsvector,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tools_price_needs_currency check (starting_price is null or currency is not null),
  constraint tools_published_minimum check (
    status <> 'published'
    or (website_url is not null and char_length(short_description) >= 20 and primary_category_id is not null)
  ),
  constraint tools_verified_has_date check (verification_status <> 'verified' or last_verified_at is not null)
);

comment on column public.tools.has_free_plan is 'NULL means unknown / not yet verified.';
comment on column public.tools.capabilities is 'Only set when confirmed by an editor. Used by the discovery wizard.';

create index tools_status_published_idx on public.tools (status, published_at desc);
create index tools_featured_idx on public.tools (is_featured) where status = 'published';
create index tools_primary_category_idx on public.tools (primary_category_id);
create index tools_pricing_idx on public.tools (pricing_type) where status = 'published';
create index tools_search_idx on public.tools using gin (search_vector);
create index tools_name_trgm_idx on public.tools using gin (name extensions.gin_trgm_ops);
create index tools_verification_idx on public.tools (verification_status, next_review_at);

create or replace function public.tools_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(new.keywords, ' ')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.developer, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.short_description, '')), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(new.description, ''), 6000)), 'C');
  return new;
end;
$$;

create trigger tools_search before insert or update on public.tools
  for each row execute function public.tools_before_write();
create trigger tools_published_at before insert or update on public.tools
  for each row execute function public.set_published_at();
create trigger tools_updated_at before update on public.tools
  for each row execute function public.set_updated_at();

create table public.tool_categories (
  tool_id uuid not null references public.tools (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (tool_id, category_id)
);
create index tool_categories_category_idx on public.tool_categories (category_id);

-- The primary category is always part of the tool's category set.
create or replace function public.tools_sync_primary_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.primary_category_id is not null then
    insert into public.tool_categories (tool_id, category_id)
    values (new.id, new.primary_category_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger tools_primary_category after insert or update of primary_category_id on public.tools
  for each row execute function public.tools_sync_primary_category();

create table public.tool_use_cases (
  tool_id uuid not null references public.tools (id) on delete cascade,
  use_case_id uuid not null references public.use_cases (id) on delete cascade,
  primary key (tool_id, use_case_id)
);
create index tool_use_cases_use_case_idx on public.tool_use_cases (use_case_id);

create table public.tool_features (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools (id) on delete cascade,
  feature_name text not null check (char_length(feature_name) between 1 and 120),
  feature_value text check (char_length(feature_value) <= 500),
  verification_notes text,
  verified_at timestamptz,
  sort_order integer not null default 0
);
create index tool_features_tool_idx on public.tool_features (tool_id, sort_order);

-- Change log for verified data. Written by trigger; staff may add notes.
create table public.tool_updates (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools (id) on delete cascade,
  field_changed text not null,
  old_value text,
  new_value text,
  note text,
  verified_at timestamptz not null default now(),
  reviewer_id uuid references auth.users (id) on delete set null
);
create index tool_updates_tool_idx on public.tool_updates (tool_id, verified_at desc);

create or replace function public.tools_log_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_field text;
begin
  foreach v_field in array array[
    'pricing_type', 'starting_price', 'currency', 'price_period', 'has_free_plan',
    'free_plan_limits', 'website_url', 'platforms', 'capabilities', 'macedonian_support',
    'verification_status', 'status'
  ] loop
    if (v_old -> v_field) is distinct from (v_new -> v_field) then
      insert into public.tool_updates (tool_id, field_changed, old_value, new_value, reviewer_id)
      values (new.id, v_field, v_old ->> v_field, v_new ->> v_field, auth.uid());
    end if;
  end loop;
  return new;
end;
$$;

create trigger tools_change_log after update on public.tools
  for each row execute function public.tools_log_changes();

-- ---------------------------------------------------------------------------
-- Articles (tutorials / водичи)
-- ---------------------------------------------------------------------------

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '' check (char_length(excerpt) <= 320),
  content text not null default '',
  cover_image_url text check (cover_image_url ~ '^https://[^\s]+$'),
  cover_image_alt text,
  cover_caption text,
  author_name text check (char_length(author_name) <= 120),
  author_id uuid references auth.users (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_published_minimum check (
    status <> 'published' or (char_length(content) >= 200 and char_length(excerpt) >= 20)
  ),
  constraint articles_cover_alt check (cover_image_url is null or char_length(cover_image_alt) > 0)
);

create index articles_status_published_idx on public.articles (status, published_at desc);
create trigger articles_published_at before insert or update on public.articles
  for each row execute function public.set_published_at();
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

create table public.article_tools (
  article_id uuid not null references public.articles (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  position integer not null default 0,
  primary key (article_id, tool_id)
);
create index article_tools_tool_idx on public.article_tools (tool_id);

-- ---------------------------------------------------------------------------
-- Comparisons (споредби)
-- ---------------------------------------------------------------------------

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  introduction text not null default '',
  verdict text not null default '',
  -- [{ "label": "…", "values": { "<tool uuid>": "…" } }]
  criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(criteria) = 'array'),
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comparisons_published_minimum check (
    status <> 'published' or char_length(introduction) >= 40
  )
);

create index comparisons_status_published_idx on public.comparisons (status, published_at desc);
create trigger comparisons_published_at before insert or update on public.comparisons
  for each row execute function public.set_published_at();
create trigger comparisons_updated_at before update on public.comparisons
  for each row execute function public.set_updated_at();

create table public.comparison_tools (
  comparison_id uuid not null references public.comparisons (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  position integer not null default 0,
  strengths text,
  limitations text,
  best_for text,
  primary key (comparison_id, tool_id)
);
create index comparison_tools_tool_idx on public.comparison_tools (tool_id);

-- ---------------------------------------------------------------------------
-- Editorial collections (најдобри)
-- ---------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 320),
  intro text not null default '',
  methodology text not null default '',
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_published_minimum check (
    status <> 'published' or (char_length(methodology) >= 60 and char_length(description) >= 20)
  )
);

create index collections_status_published_idx on public.collections (status, published_at desc);
create trigger collections_published_at before insert or update on public.collections
  for each row execute function public.set_published_at();
create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

create table public.collection_tools (
  collection_id uuid not null references public.collections (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  position integer not null default 0,
  editorial_reason text not null check (char_length(editorial_reason) between 10 and 1200),
  is_sponsored boolean not null default false,
  primary key (collection_id, tool_id)
);
create index collection_tools_tool_idx on public.collection_tools (tool_id);

-- ---------------------------------------------------------------------------
-- Site settings (contact and legal details supplied by the owner)
-- ---------------------------------------------------------------------------

create table public.site_settings (
  key text primary key check (key in (
    'contact_email', 'publisher_name', 'publisher_address', 'publisher_registration',
    'editorial_email', 'advertising_email', 'about_text'
  )),
  value text not null default '' check (char_length(value) <= 4000),
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
