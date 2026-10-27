-- AI KATALOG — Row Level Security and grants for content tables.
-- Public visitors (anon) may only read published content. Staff (editor/admin)
-- manage content. Deleting requires the admin role. Roles are never writable
-- from a browser session.

-- Start from a clean slate: Supabase grants broad default privileges.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.use_cases enable row level security;
alter table public.tools enable row level security;
alter table public.tool_categories enable row level security;
alter table public.tool_use_cases enable row level security;
alter table public.tool_features enable row level security;
alter table public.tool_updates enable row level security;
alter table public.articles enable row level security;
alter table public.article_tools enable row level security;
alter table public.comparisons enable row level security;
alter table public.comparison_tools enable row level security;
alter table public.collections enable row level security;
alter table public.collection_tools enable row level security;
alter table public.site_settings enable row level security;

-- Helper functions used inside policies must be executable by every role.
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.assert_staff() to authenticated;
grant execute on function public.assert_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- user_roles: a user may see their own role; admins may see all roles.
-- No insert/update/delete grant exists for anon or authenticated, so roles can
-- only be assigned with the service role or the SQL editor.
-- ---------------------------------------------------------------------------

grant select on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Status-bearing content tables
-- ---------------------------------------------------------------------------

grant select on public.categories, public.use_cases, public.tools, public.articles,
  public.comparisons, public.collections to anon, authenticated;
grant insert, update, delete on public.categories, public.use_cases, public.tools,
  public.articles, public.comparisons, public.collections to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'use_cases', 'tools', 'articles', 'comparisons', 'collections'] loop
    execute format(
      'create policy %1$s_public_read on public.%1$I for select to anon, authenticated
         using (status = ''published'' or (select public.is_staff()))', t);
    execute format(
      'create policy %1$s_staff_insert on public.%1$I for insert to authenticated
         with check ((select public.is_staff()))', t);
    execute format(
      'create policy %1$s_staff_update on public.%1$I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format(
      'create policy %1$s_admin_delete on public.%1$I for delete to authenticated
         using ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Relation tables: readable when the related public records are published.
-- ---------------------------------------------------------------------------

grant select on public.tool_categories, public.tool_use_cases, public.tool_features,
  public.article_tools, public.comparison_tools, public.collection_tools to anon, authenticated;
grant insert, update, delete on public.tool_categories, public.tool_use_cases, public.tool_features,
  public.article_tools, public.comparison_tools, public.collection_tools to authenticated;

create policy tool_categories_read on public.tool_categories for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.tools t where t.id = tool_id and t.status = 'published')
  );

create policy tool_use_cases_read on public.tool_use_cases for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.tools t where t.id = tool_id and t.status = 'published')
  );

create policy tool_features_read on public.tool_features for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.tools t where t.id = tool_id and t.status = 'published')
  );

create policy article_tools_read on public.article_tools for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')
  );

create policy comparison_tools_read on public.comparison_tools for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.comparisons c where c.id = comparison_id and c.status = 'published')
  );

create policy collection_tools_read on public.collection_tools for select to anon, authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')
  );

do $$
declare
  t text;
begin
  foreach t in array array['tool_categories', 'tool_use_cases', 'tool_features', 'article_tools', 'comparison_tools', 'collection_tools'] loop
    execute format(
      'create policy %1$s_staff_insert on public.%1$I for insert to authenticated
         with check ((select public.is_staff()))', t);
    execute format(
      'create policy %1$s_staff_update on public.%1$I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format(
      'create policy %1$s_staff_delete on public.%1$I for delete to authenticated
         using ((select public.is_staff()))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- tool_updates: staff-only audit log.
-- ---------------------------------------------------------------------------

grant select, insert on public.tool_updates to authenticated;
create policy tool_updates_staff_read on public.tool_updates for select to authenticated
  using ((select public.is_staff()));
create policy tool_updates_staff_insert on public.tool_updates for insert to authenticated
  with check ((select public.is_staff()) and reviewer_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- site_settings: public read, admin write.
-- ---------------------------------------------------------------------------

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
create policy site_settings_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin_insert on public.site_settings for insert to authenticated
  with check ((select public.is_admin()));
create policy site_settings_admin_update on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy site_settings_admin_delete on public.site_settings for delete to authenticated
  using ((select public.is_admin()));
