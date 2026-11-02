-- AI KATALOG — growth features, part 1: schema and Row Level Security.
--   * prompt library (prompts, prompt_tools)
--   * AI glossary (glossary_terms, glossary_links, glossary_tools)
--   * „Тестирано на македонски“ (language_tests)
--   * collections for professions (collections.kind / audience_label)
--   * learning paths (learning_paths, learning_path_steps)
--   * price-change alerts (tool_watchers, notification_queue)
--   * social channel links in site_settings

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Prompt library
-- ---------------------------------------------------------------------------

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null default '' check (char_length(summary) <= 320),
  prompt_text text not null default '' check (char_length(prompt_text) <= 6000),
  how_to_use text not null default '',
  example_output text,
  use_case_id uuid references public.use_cases (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  skill_level public.skill_level,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prompts_published_minimum check (
    status <> 'published' or (char_length(prompt_text) >= 20 and char_length(summary) >= 20)
  )
);
create index prompts_status_idx on public.prompts (status, is_featured desc, published_at desc);
create index prompts_use_case_idx on public.prompts (use_case_id);
create trigger prompts_published_at before insert or update on public.prompts
  for each row execute function public.set_published_at();
create trigger prompts_updated_at before update on public.prompts
  for each row execute function public.set_updated_at();

create table public.prompt_tools (
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  position integer not null default 0,
  primary key (prompt_id, tool_id)
);
create index prompt_tools_tool_idx on public.prompt_tools (tool_id);

-- ---------------------------------------------------------------------------
-- Glossary
-- ---------------------------------------------------------------------------

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  english_term text check (char_length(english_term) <= 120),
  short_definition text not null default '' check (char_length(short_definition) <= 300),
  body text not null default '',
  status public.content_status not null default 'draft',
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_published_minimum check (status <> 'published' or char_length(short_definition) >= 20)
);
create index glossary_terms_status_idx on public.glossary_terms (status);
create trigger glossary_terms_published_at before insert or update on public.glossary_terms
  for each row execute function public.set_published_at();
create trigger glossary_terms_updated_at before update on public.glossary_terms
  for each row execute function public.set_updated_at();

create table public.glossary_links (
  term_id uuid not null references public.glossary_terms (id) on delete cascade,
  related_term_id uuid not null references public.glossary_terms (id) on delete cascade,
  primary key (term_id, related_term_id),
  check (term_id <> related_term_id)
);

create table public.glossary_tools (
  term_id uuid not null references public.glossary_terms (id) on delete cascade,
  tool_id uuid not null references public.tools (id) on delete cascade,
  primary key (term_id, tool_id)
);

-- ---------------------------------------------------------------------------
-- „Тестирано на македонски“: real editorial tests of Macedonian output
-- ---------------------------------------------------------------------------

create table public.language_tests (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools (id) on delete cascade,
  task_title text not null check (char_length(task_title) between 3 and 160),
  prompt_used text not null default '' check (char_length(prompt_used) <= 4000),
  output_excerpt text not null default '' check (char_length(output_excerpt) <= 6000),
  verdict text not null default 'mixed' check (verdict in ('excellent', 'good', 'mixed', 'poor')),
  notes text not null default '',
  plan_tested text check (char_length(plan_tested) <= 120),
  model_version text check (char_length(model_version) <= 120),
  tested_at date not null default current_date,
  screenshot_url text check (screenshot_url ~ '^https://[^\s]+$'),
  screenshot_alt text check (char_length(screenshot_alt) <= 300),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tested_by uuid references auth.users (id) on delete set null,
  constraint language_tests_published_minimum check (
    status <> 'published' or (char_length(prompt_used) >= 10 and char_length(output_excerpt) >= 20)
  ),
  constraint language_tests_screenshot_alt check (screenshot_url is null or char_length(screenshot_alt) > 0)
);
create index language_tests_tool_idx on public.language_tests (tool_id, status);
create index language_tests_task_idx on public.language_tests (lower(task_title)) where status = 'published';
create trigger language_tests_published_at before insert or update on public.language_tests
  for each row execute function public.set_published_at();
create trigger language_tests_updated_at before update on public.language_tests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Collections for professions
-- ---------------------------------------------------------------------------

alter table public.collections
  add column kind text not null default 'topic' check (kind in ('topic', 'audience')),
  add column audience_label text check (char_length(audience_label) <= 60);

-- ---------------------------------------------------------------------------
-- Learning paths
-- ---------------------------------------------------------------------------

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text not null default '' check (char_length(summary) <= 320),
  intro text not null default '',
  level public.skill_level,
  estimated_days integer check (estimated_days between 1 and 90),
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_paths_published_minimum check (status <> 'published' or char_length(summary) >= 20)
);
create trigger learning_paths_published_at before insert or update on public.learning_paths
  for each row execute function public.set_published_at();
create trigger learning_paths_updated_at before update on public.learning_paths
  for each row execute function public.set_updated_at();

create table public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  position integer not null default 0,
  title text not null check (char_length(title) between 3 and 160),
  body text not null default '',
  step_type text not null default 'read' check (step_type in ('read', 'watch', 'practice', 'explore')),
  article_id uuid references public.articles (id) on delete set null,
  tool_id uuid references public.tools (id) on delete set null,
  prompt_id uuid references public.prompts (id) on delete set null,
  video_id uuid references public.tool_videos (id) on delete set null,
  estimated_minutes integer check (estimated_minutes between 1 and 600)
);
create index learning_path_steps_path_idx on public.learning_path_steps (path_id, position);

-- ---------------------------------------------------------------------------
-- Price-change alerts (double opt-in) and the outgoing e-mail queue
-- ---------------------------------------------------------------------------

create table public.tool_watchers (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.tools (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  consent_at timestamptz not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index tool_watchers_tool_email_idx on public.tool_watchers (tool_id, lower(email));
create index tool_watchers_active_idx on public.tool_watchers (tool_id) where status = 'active';

create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('watch_confirm', 'price_change')),
  email text not null check (char_length(email) <= 254),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_queue_pending_idx on public.notification_queue (status, created_at) where status in ('pending', 'failed');
create trigger notification_queue_updated_at before update on public.notification_queue
  for each row execute function public.set_updated_at();

insert into private.app_secrets (name, value)
values ('watch_secret', encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text || 'watch', 'UTF8')), 'hex'))
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Social channel links
-- ---------------------------------------------------------------------------

alter table public.site_settings drop constraint site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check (key in (
  'contact_email', 'publisher_name', 'publisher_address', 'publisher_registration',
  'editorial_email', 'advertising_email', 'about_text',
  'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url', 'linkedin_url', 'telegram_url', 'viber_url'
));
alter table public.site_settings add constraint site_settings_url_check check (
  key not like '%\_url' or value = '' or value ~ '^https://[^\s]+$'
);

-- ---------------------------------------------------------------------------
-- Row Level Security and grants
-- ---------------------------------------------------------------------------

alter table public.prompts enable row level security;
alter table public.prompt_tools enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.glossary_links enable row level security;
alter table public.glossary_tools enable row level security;
alter table public.language_tests enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.tool_watchers enable row level security;
alter table public.notification_queue enable row level security;

revoke all on public.prompts, public.prompt_tools, public.glossary_terms, public.glossary_links,
  public.glossary_tools, public.language_tests, public.learning_paths, public.learning_path_steps,
  public.tool_watchers, public.notification_queue from anon, authenticated;

grant select on public.prompts, public.prompt_tools, public.glossary_terms, public.glossary_links,
  public.glossary_tools, public.language_tests, public.learning_paths, public.learning_path_steps
  to anon, authenticated;
grant insert, update, delete on public.prompts, public.prompt_tools, public.glossary_terms, public.glossary_links,
  public.glossary_tools, public.language_tests, public.learning_paths, public.learning_path_steps
  to authenticated;

-- Status-bearing tables: published for everyone, everything for staff.
do $$
declare
  t text;
begin
  foreach t in array array['prompts', 'glossary_terms', 'learning_paths'] loop
    execute format(
      'create policy %1$s_public_read on public.%1$I for select to anon, authenticated
         using (status = ''published'' or (select public.is_staff()))', t);
    execute format('create policy %1$s_staff_insert on public.%1$I for insert to authenticated with check ((select public.is_staff()))', t);
    execute format('create policy %1$s_staff_update on public.%1$I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format('create policy %1$s_admin_delete on public.%1$I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- A language test is public only when it and its tool are published.
create policy language_tests_public_read on public.language_tests for select to anon, authenticated
  using (
    (select public.is_staff())
    or (status = 'published' and exists (select 1 from public.tools t where t.id = tool_id and t.status = 'published'))
  );

create policy prompt_tools_read on public.prompt_tools for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.prompts p where p.id = prompt_id and p.status = 'published'));
create policy glossary_links_read on public.glossary_links for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.glossary_terms g where g.id = term_id and g.status = 'published'));
create policy glossary_tools_read on public.glossary_tools for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.glossary_terms g where g.id = term_id and g.status = 'published'));
create policy learning_path_steps_read on public.learning_path_steps for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.learning_paths p where p.id = path_id and p.status = 'published'));

do $$
declare
  t text;
begin
  foreach t in array array['language_tests', 'prompt_tools', 'glossary_links', 'glossary_tools', 'learning_path_steps'] loop
    execute format('create policy %1$s_staff_insert on public.%1$I for insert to authenticated with check ((select public.is_staff()))', t);
    execute format('create policy %1$s_staff_update on public.%1$I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format('create policy %1$s_staff_delete on public.%1$I for delete to authenticated using ((select public.is_staff()))', t);
  end loop;
end;
$$;

-- Watchers and the e-mail queue contain e-mail addresses: admins may read
-- them; nobody writes them from a browser (only validated functions do).
grant select on public.tool_watchers, public.notification_queue to authenticated;
create policy tool_watchers_admin_read on public.tool_watchers for select to authenticated using ((select public.is_admin()));
create policy notification_queue_admin_read on public.notification_queue for select to authenticated using ((select public.is_admin()));
