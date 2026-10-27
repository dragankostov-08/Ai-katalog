-- AI KATALOG — administrative API.
-- Every function is SECURITY INVOKER and starts with an explicit role check, so
-- authorization is enforced twice: by the check and by Row Level Security.
-- Multi-table saves run inside a single transaction.

create or replace function public.admin_me()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'email', auth.jwt() ->> 'email',
    'role', (select r.role from public.user_roles r where r.user_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'tools', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.tools group by status) s),
    'articles', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.articles group by status) s),
    'comparisons', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.comparisons group by status) s),
    'collections', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from public.collections group by status) s),
    'pending_submissions', (select count(*) from public.submissions where status = 'pending'),
    'new_messages', (select count(*) from public.contact_messages where status = 'new'),
    'verification_due', (
      select count(*) from public.tools
      where status in ('published', 'needs_review')
        and (verification_status <> 'verified'
             or next_review_at <= current_date
             or last_verified_at < now() - interval '120 days')
    ),
    'clicks_30d', (select coalesce(sum(clicks), 0) from public.outbound_clicks where day > current_date - 30),
    'missing_settings', (
      select coalesce(jsonb_agg(k), '[]'::jsonb)
      from unnest(array['contact_email', 'publisher_name']) k
      where not exists (select 1 from public.site_settings s where s.key = k and s.value <> '')
    ),
    'recent_updates', coalesce((
      select jsonb_agg(x order by x.verified_at desc)
      from (
        select u.field_changed, u.old_value, u.new_value, u.note, u.verified_at, t.name as tool_name, t.id as tool_id
        from public.tool_updates u join public.tools t on t.id = u.tool_id
        order by u.verified_at desc limit 12
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic listing for the six managed entities
-- ---------------------------------------------------------------------------

create or replace function public.admin_list(
  p_entity text,
  p_status text default null,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_title text;
  v_strip text[] := array['search_vector'];
  v_result jsonb;
  v_query text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform public.assert_staff();

  case p_entity
    when 'tools' then v_title := 'name'; v_strip := v_strip || array['description', 'pros', 'cons', 'editorial_verdict'];
    when 'categories' then v_title := 'name';
    when 'use_cases' then v_title := 'name';
    when 'articles' then v_title := 'title'; v_strip := v_strip || array['content'];
    when 'comparisons' then v_title := 'title'; v_strip := v_strip || array['introduction', 'verdict', 'criteria'];
    when 'collections' then v_title := 'title'; v_strip := v_strip || array['intro', 'methodology'];
    else raise exception 'Непознат тип на содржина: %', p_entity using errcode = '22023';
  end case;

  execute format($sql$
    with f as (
      select x.* from public.%1$I x
      where ($1::text is null or x.status::text = $1)
        and ($2::text is null or x.%2$I ilike $3 or x.slug ilike $3)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'items', coalesce((
        select jsonb_agg((to_jsonb(p) - $6) order by p.ord)
        from (
          select f.*, row_number() over (order by %3$s) as ord
          from f order by %3$s
          limit $4 offset $5
        ) p
      ), '[]'::jsonb)
    )$sql$,
    p_entity, v_title,
    case when p_entity in ('categories', 'use_cases') then 'f.sort_order, f.name' else 'f.updated_at desc' end
  )
  into v_result
  using nullif(p_status, ''), v_query, '%' || public.escape_like(coalesce(v_query, '')) || '%',
        least(greatest(coalesce(p_limit, 50), 1), 200), greatest(coalesce(p_offset, 0), 0), v_strip;

  return v_result;
end;
$$;

-- Lightweight option lists for pickers in editors.
create or replace function public.admin_options()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status) order by sort_order, name) from public.categories), '[]'::jsonb),
    'use_cases', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status) order by sort_order, name) from public.use_cases), '[]'::jsonb),
    'tools', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status) order by lower(name)) from public.tools), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Status changes and deletion
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_status(p_entity text, p_id uuid, p_status public.content_status)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform public.assert_staff();
  if p_entity not in ('tools', 'categories', 'use_cases', 'articles', 'comparisons', 'collections') then
    raise exception 'Непознат тип на содржина: %', p_entity using errcode = '22023';
  end if;
  execute format('update public.%I set status = $1 where id = $2', p_entity) using p_status, p_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Записот не е пронајден.' using errcode = 'P0002';
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
  if p_entity not in ('tools', 'categories', 'use_cases', 'articles', 'comparisons', 'collections', 'submissions', 'contact_messages') then
    raise exception 'Непознат тип на содржина: %', p_entity using errcode = '22023';
  end if;
  execute format('delete from public.%I where id = $1', p_entity) using p_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Записот не е пронајден.' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tools
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_tool(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  t public.tools;
begin
  perform public.assert_staff();
  select * into t from public.tools where id = p_id;
  if not found then
    return null;
  end if;
  return (to_jsonb(t) - 'search_vector') || jsonb_build_object(
    'category_ids', coalesce((select jsonb_agg(category_id) from public.tool_categories where tool_id = t.id), '[]'::jsonb),
    'use_case_ids', coalesce((select jsonb_agg(use_case_id) from public.tool_use_cases where tool_id = t.id), '[]'::jsonb),
    'features', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'feature_name', f.feature_name, 'feature_value', f.feature_value,
        'verification_notes', f.verification_notes, 'verified_at', f.verified_at
      ) order by f.sort_order)
      from public.tool_features f where f.tool_id = t.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(x order by x.verified_at desc)
      from (
        select u.id, u.field_changed, u.old_value, u.new_value, u.note, u.verified_at
        from public.tool_updates u where u.tool_id = t.id
        order by u.verified_at desc limit 40
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_tool(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.tools;
  v_ids uuid[];
  v_feature jsonb;
  v_index bigint;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.tools, p);

  if v_id is null then
    insert into public.tools (
      name, slug, short_description, description, website_url, logo_url, developer,
      primary_category_id, pricing_type, starting_price, currency, price_period, has_free_plan,
      free_plan_limits, pricing_notes, platforms, capabilities, macedonian_support, skill_level,
      best_for, pros, cons, editorial_verdict, keywords, next_review_at, status, is_featured,
      is_sponsored, sponsor_note, seo_title, seo_description
    ) values (
      trim(r.name), r.slug, coalesce(r.short_description, ''), coalesce(r.description, ''),
      nullif(r.website_url, ''), nullif(r.logo_url, ''), nullif(r.developer, ''),
      r.primary_category_id, coalesce(r.pricing_type, 'unknown'), r.starting_price, nullif(r.currency, ''),
      nullif(r.price_period, ''), r.has_free_plan, nullif(r.free_plan_limits, ''), nullif(r.pricing_notes, ''),
      coalesce(r.platforms, '{}'), coalesce(r.capabilities, '{}'), coalesce(r.macedonian_support, 'unknown'),
      r.skill_level, nullif(r.best_for, ''), coalesce(r.pros, '{}'), coalesce(r.cons, '{}'),
      nullif(r.editorial_verdict, ''), coalesce(r.keywords, '{}'), r.next_review_at,
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), coalesce(r.is_sponsored, false),
      nullif(r.sponsor_note, ''), nullif(r.seo_title, ''), nullif(r.seo_description, '')
    )
    returning id into v_id;
  else
    update public.tools set
      name = trim(r.name), slug = r.slug,
      short_description = coalesce(r.short_description, ''), description = coalesce(r.description, ''),
      website_url = nullif(r.website_url, ''), logo_url = nullif(r.logo_url, ''), developer = nullif(r.developer, ''),
      primary_category_id = r.primary_category_id, pricing_type = coalesce(r.pricing_type, 'unknown'),
      starting_price = r.starting_price, currency = nullif(r.currency, ''), price_period = nullif(r.price_period, ''),
      has_free_plan = r.has_free_plan, free_plan_limits = nullif(r.free_plan_limits, ''),
      pricing_notes = nullif(r.pricing_notes, ''), platforms = coalesce(r.platforms, '{}'),
      capabilities = coalesce(r.capabilities, '{}'), macedonian_support = coalesce(r.macedonian_support, 'unknown'),
      skill_level = r.skill_level, best_for = nullif(r.best_for, ''), pros = coalesce(r.pros, '{}'),
      cons = coalesce(r.cons, '{}'), editorial_verdict = nullif(r.editorial_verdict, ''),
      keywords = coalesce(r.keywords, '{}'), next_review_at = r.next_review_at,
      status = coalesce(r.status, status), is_featured = coalesce(r.is_featured, false),
      is_sponsored = coalesce(r.is_sponsored, false), sponsor_note = nullif(r.sponsor_note, ''),
      seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Алатката не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;

  if p ? 'category_ids' then
    v_ids := array(select jsonb_array_elements_text(p -> 'category_ids')::uuid);
    delete from public.tool_categories
     where tool_id = v_id and category_id <> all (v_ids) and category_id is distinct from r.primary_category_id;
    insert into public.tool_categories (tool_id, category_id)
    select v_id, x from unnest(v_ids) x on conflict do nothing;
  end if;

  if p ? 'use_case_ids' then
    v_ids := array(select jsonb_array_elements_text(p -> 'use_case_ids')::uuid);
    delete from public.tool_use_cases where tool_id = v_id and use_case_id <> all (v_ids);
    insert into public.tool_use_cases (tool_id, use_case_id)
    select v_id, x from unnest(v_ids) x on conflict do nothing;
  end if;

  if p ? 'features' then
    v_ids := array(
      select (f ->> 'id')::uuid from jsonb_array_elements(p -> 'features') f
      where nullif(f ->> 'id', '') is not null
    );
    delete from public.tool_features where tool_id = v_id and id <> all (v_ids);
    for v_feature, v_index in select f, i from jsonb_array_elements(p -> 'features') with ordinality as x(f, i) loop
      if nullif(v_feature ->> 'id', '') is not null then
        update public.tool_features set
          feature_name = trim(v_feature ->> 'feature_name'),
          feature_value = nullif(trim(coalesce(v_feature ->> 'feature_value', '')), ''),
          verification_notes = nullif(trim(coalesce(v_feature ->> 'verification_notes', '')), ''),
          verified_at = nullif(v_feature ->> 'verified_at', '')::timestamptz,
          sort_order = v_index
        where id = (v_feature ->> 'id')::uuid and tool_id = v_id;
      else
        insert into public.tool_features (tool_id, feature_name, feature_value, verification_notes, verified_at, sort_order)
        values (
          v_id, trim(v_feature ->> 'feature_name'),
          nullif(trim(coalesce(v_feature ->> 'feature_value', '')), ''),
          nullif(trim(coalesce(v_feature ->> 'verification_notes', '')), ''),
          nullif(v_feature ->> 'verified_at', '')::timestamptz, v_index
        );
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

-- Records an editorial verification of pricing and features.
create or replace function public.admin_verify_tool(p_id uuid, p_note text default null, p_next_review date default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.tools set
    verification_status = 'verified',
    last_verified_at = now(),
    verified_by = auth.uid(),
    verification_notes = coalesce(nullif(trim(coalesce(p_note, '')), ''), verification_notes),
    next_review_at = coalesce(p_next_review, current_date + 90)
  where id = p_id;
  if not found then
    raise exception 'Алатката не е пронајдена.' using errcode = 'P0002';
  end if;
  insert into public.tool_updates (tool_id, field_changed, note, reviewer_id)
  values (p_id, 'verification', coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Податоците се проверени.'), auth.uid());
end;
$$;

create or replace function public.admin_flag_tool(p_id uuid, p_note text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  if char_length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'Опишете што треба да се провери.' using errcode = '22023';
  end if;
  update public.tools set verification_status = 'needs_update', verification_notes = trim(p_note) where id = p_id;
  if not found then
    raise exception 'Алатката не е пронајдена.' using errcode = 'P0002';
  end if;
  insert into public.tool_updates (tool_id, field_changed, note, reviewer_id)
  values (p_id, 'verification_flag', trim(p_note), auth.uid());
end;
$$;

create or replace function public.admin_review_queue()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'needs_review', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status, 'updated_at', updated_at,
        'verification_status', verification_status, 'last_verified_at', last_verified_at) order by updated_at desc)
      from public.tools where status = 'needs_review'
    ), '[]'::jsonb),
    'verification', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status,
        'verification_status', verification_status, 'verification_notes', verification_notes,
        'last_verified_at', last_verified_at, 'next_review_at', next_review_at,
        'reason', case
          when verification_status = 'needs_update' then 'flagged'
          when verification_status = 'unverified' then 'unverified'
          when next_review_at <= current_date then 'due'
          else 'stale'
        end) order by coalesce(next_review_at, current_date - 3650), name)
      from public.tools
      where status in ('published', 'needs_review', 'draft')
        and (verification_status <> 'verified'
             or next_review_at <= current_date
             or last_verified_at < now() - interval '120 days')
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories and use cases
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_category(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.categories;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.categories, p);
  if v_id is null then
    insert into public.categories (name, slug, description, intro, icon, accent, sort_order, status, seo_title, seo_description)
    values (trim(r.name), r.slug, coalesce(r.description, ''), coalesce(r.intro, ''), nullif(r.icon, ''), nullif(r.accent, ''),
      coalesce(r.sort_order, 0), coalesce(r.status, 'draft'), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.categories set
      name = trim(r.name), slug = r.slug, description = coalesce(r.description, ''), intro = coalesce(r.intro, ''),
      icon = nullif(r.icon, ''), accent = nullif(r.accent, ''), sort_order = coalesce(r.sort_order, 0),
      status = coalesce(r.status, status), seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Категоријата не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_save_use_case(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.use_cases;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.use_cases, p);
  if v_id is null then
    insert into public.use_cases (name, slug, task_label, description, sort_order, status)
    values (trim(r.name), r.slug, trim(r.task_label), coalesce(r.description, ''), coalesce(r.sort_order, 0), coalesce(r.status, 'draft'))
    returning id into v_id;
  else
    update public.use_cases set
      name = trim(r.name), slug = r.slug, task_label = trim(r.task_label), description = coalesce(r.description, ''),
      sort_order = coalesce(r.sort_order, 0), status = coalesce(r.status, status)
    where id = v_id;
    if not found then
      raise exception 'Намената не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_article(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  a public.articles;
begin
  perform public.assert_staff();
  select * into a from public.articles where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(a) || jsonb_build_object(
    'tool_ids', coalesce((select jsonb_agg(tool_id order by position) from public.article_tools where article_id = a.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_article(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.articles;
  v_ids uuid[];
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.articles, p);
  if v_id is null then
    insert into public.articles (title, slug, excerpt, content, cover_image_url, cover_image_alt, cover_caption,
      author_name, author_id, category_id, status, is_featured, seo_title, seo_description)
    values (trim(r.title), r.slug, coalesce(r.excerpt, ''), coalesce(r.content, ''), nullif(r.cover_image_url, ''),
      nullif(r.cover_image_alt, ''), nullif(r.cover_caption, ''), nullif(r.author_name, ''), auth.uid(), r.category_id,
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.articles set
      title = trim(r.title), slug = r.slug, excerpt = coalesce(r.excerpt, ''), content = coalesce(r.content, ''),
      cover_image_url = nullif(r.cover_image_url, ''), cover_image_alt = nullif(r.cover_image_alt, ''),
      cover_caption = nullif(r.cover_caption, ''), author_name = nullif(r.author_name, ''), category_id = r.category_id,
      status = coalesce(r.status, status), is_featured = coalesce(r.is_featured, false),
      seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Водичот не е пронајден.' using errcode = 'P0002';
    end if;
  end if;

  if p ? 'tool_ids' then
    v_ids := array(select jsonb_array_elements_text(p -> 'tool_ids')::uuid);
    delete from public.article_tools where article_id = v_id;
    insert into public.article_tools (article_id, tool_id, position)
    select v_id, x, i from unnest(v_ids) with ordinality as u(x, i) on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comparisons
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_comparison(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.comparisons;
begin
  perform public.assert_staff();
  select * into c from public.comparisons where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(c) || jsonb_build_object(
    'tools', coalesce((
      select jsonb_agg(jsonb_build_object('tool_id', tool_id, 'strengths', strengths, 'limitations', limitations, 'best_for', best_for) order by position)
      from public.comparison_tools where comparison_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_comparison(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.comparisons;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.comparisons, p);

  if coalesce(r.status, 'draft') = 'published' and jsonb_array_length(coalesce(p -> 'tools', '[]'::jsonb)) < 2 then
    raise exception 'Споредбата мора да содржи најмалку две алатки.' using errcode = '23514';
  end if;

  if v_id is null then
    insert into public.comparisons (title, slug, introduction, verdict, criteria, status, is_featured, seo_title, seo_description)
    values (trim(r.title), r.slug, coalesce(r.introduction, ''), coalesce(r.verdict, ''), coalesce(r.criteria, '[]'::jsonb),
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.comparisons set
      title = trim(r.title), slug = r.slug, introduction = coalesce(r.introduction, ''), verdict = coalesce(r.verdict, ''),
      criteria = coalesce(r.criteria, '[]'::jsonb), status = coalesce(r.status, status),
      is_featured = coalesce(r.is_featured, false), seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Споредбата не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;

  if p ? 'tools' then
    delete from public.comparison_tools where comparison_id = v_id;
    insert into public.comparison_tools (comparison_id, tool_id, position, strengths, limitations, best_for)
    select v_id, (x ->> 'tool_id')::uuid, i,
      nullif(trim(coalesce(x ->> 'strengths', '')), ''),
      nullif(trim(coalesce(x ->> 'limitations', '')), ''),
      nullif(trim(coalesce(x ->> 'best_for', '')), '')
    from jsonb_array_elements(p -> 'tools') with ordinality as u(x, i)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_collection(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.collections;
begin
  perform public.assert_staff();
  select * into c from public.collections where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(c) || jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('tool_id', tool_id, 'editorial_reason', editorial_reason, 'is_sponsored', is_sponsored) order by position)
      from public.collection_tools where collection_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_collection(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.collections;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.collections, p);
  if v_id is null then
    insert into public.collections (title, slug, description, intro, methodology, status, is_featured, seo_title, seo_description)
    values (trim(r.title), r.slug, coalesce(r.description, ''), coalesce(r.intro, ''), coalesce(r.methodology, ''),
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.collections set
      title = trim(r.title), slug = r.slug, description = coalesce(r.description, ''), intro = coalesce(r.intro, ''),
      methodology = coalesce(r.methodology, ''), status = coalesce(r.status, status),
      is_featured = coalesce(r.is_featured, false), seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Колекцијата не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;

  if p ? 'entries' then
    delete from public.collection_tools where collection_id = v_id;
    insert into public.collection_tools (collection_id, tool_id, position, editorial_reason, is_sponsored)
    select v_id, (x ->> 'tool_id')::uuid, i, trim(x ->> 'editorial_reason'), coalesce((x ->> 'is_sponsored')::boolean, false)
    from jsonb_array_elements(p -> 'entries') with ordinality as u(x, i)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation: submissions and contact messages
-- ---------------------------------------------------------------------------

create or replace function public.admin_submissions(p_status public.submission_status default 'pending')
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(s) order by s.created_at desc)
    from (select * from public.submissions where status = p_status order by created_at desc limit 200) s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_submission(p_id uuid, p_status public.submission_status, p_note text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.submissions set
    status = p_status, moderator_note = nullif(trim(coalesce(p_note, '')), ''),
    reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id;
  if not found then
    raise exception 'Предлогот не е пронајден.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_messages(p_status text default 'new')
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(m) order by m.created_at desc)
    from (select * from public.contact_messages where status = p_status order by created_at desc limit 200) m
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_message(p_id uuid, p_status text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  update public.contact_messages set status = p_status where id = p_id;
  if not found then
    raise exception 'Пораката не е пронајдена.' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aggregate analytics
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_since date := current_date - least(greatest(coalesce(p_days, 30), 1), 365);
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'since', v_since,
    'outbound_total', (select coalesce(sum(clicks), 0) from public.outbound_clicks where day > v_since),
    'outbound_by_tool', coalesce((
      select jsonb_agg(x order by x.clicks desc)
      from (
        select t.name, t.slug, sum(o.clicks)::integer as clicks
        from public.outbound_clicks o join public.tools t on t.id = o.tool_id
        where o.day > v_since
        group by t.name, t.slug
        order by clicks desc limit 25
      ) x
    ), '[]'::jsonb),
    'outbound_by_context', coalesce((
      select jsonb_object_agg(context, clicks)
      from (select context, sum(clicks)::integer clicks from public.outbound_clicks where day > v_since group by context) x
    ), '{}'::jsonb),
    'events', coalesce((
      select jsonb_object_agg(event, total)
      from (select event, sum(count)::integer total from public.analytics_daily where day > v_since group by event) x
    ), '{}'::jsonb),
    'top_dimensions', coalesce((
      select jsonb_agg(x order by x.event, x.total desc)
      from (
        select event, dimension, total from (
          select event, dimension, sum(count)::integer total,
            row_number() over (partition by event order by sum(count) desc) rn
          from public.analytics_daily
          where day > v_since and dimension <> ''
          group by event, dimension
        ) ranked where rn <= 10
      ) x
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(x order by x.day)
      from (
        select d.day::date as day,
          coalesce((select sum(clicks) from public.outbound_clicks o where o.day = d.day::date), 0)::integer as clicks,
          coalesce((select sum(count) from public.analytics_daily a where a.day = d.day::date and a.event = 'tool_view'), 0)::integer as tool_views
        from generate_series(v_since + 1, current_date, interval '1 day') d(day)
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Newsletter (admin only: contains personal data)
-- ---------------------------------------------------------------------------

create or replace function public.admin_newsletter()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'subscribed', (select count(*) from public.newsletter_subscribers where subscription_status = 'subscribed'),
    'unsubscribed', (select count(*) from public.newsletter_subscribers where subscription_status = 'unsubscribed'),
    'subscribers', coalesce((
      select jsonb_agg(jsonb_build_object('email', email, 'consent_at', consent_at, 'consent_version', consent_version,
        'status', subscription_status, 'unsubscribed_at', unsubscribed_at) order by created_at desc)
      from public.newsletter_subscribers
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Site settings
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_settings(p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_key text;
  v_value text;
begin
  perform public.assert_admin();
  for v_key, v_value in select key, value from jsonb_each_text(p) loop
    insert into public.site_settings (key, value) values (v_key, trim(coalesce(v_value, '')))
    on conflict (key) do update set value = excluded.value;
  end loop;
end;
$$;

revoke execute on all functions in schema public from public;
-- Re-grant the public API that the previous statement also covered.
grant execute on function
  public.is_staff(), public.is_admin(),
  public.prefix_tsquery(text), public.escape_like(text), public.reading_minutes(text),
  public.can_see(public.content_status, boolean), public.tool_card(public.tools),
  public.article_card(public.articles), public.comparison_card(public.comparisons),
  public.collection_card(public.collections), public.comparison_is_complete(uuid),
  public.collection_is_complete(uuid), public.api_site(), public.api_home(),
  public.api_search_tools(text, text, text, text[], boolean, text, text, integer, integer),
  public.api_category(text, boolean), public.api_tool(text, boolean),
  public.api_articles(integer, integer), public.api_article(text, boolean),
  public.api_comparisons(), public.api_comparison(text, boolean),
  public.api_collections(), public.api_collection(text, boolean),
  public.api_wizard_tools(), public.api_tools_by_slugs(text[]), public.api_sitemap(),
  public.submit_tool(text, text, text, text, text, integer),
  public.send_contact_message(text, text, text, text, text, integer),
  public.newsletter_subscribe(text, boolean, text, text),
  public.newsletter_unsubscribe(text),
  public.track_outbound(text, text), public.track_event(text, text)
to anon, authenticated;

grant execute on function
  public.assert_staff(), public.assert_admin(), public.admin_me(), public.admin_dashboard(),
  public.admin_list(text, text, text, integer, integer), public.admin_options(),
  public.admin_set_status(text, uuid, public.content_status), public.admin_delete(text, uuid),
  public.admin_get_tool(uuid), public.admin_save_tool(jsonb),
  public.admin_verify_tool(uuid, text, date), public.admin_flag_tool(uuid, text),
  public.admin_review_queue(), public.admin_save_category(jsonb), public.admin_save_use_case(jsonb),
  public.admin_get_article(uuid), public.admin_save_article(jsonb),
  public.admin_get_comparison(uuid), public.admin_save_comparison(jsonb),
  public.admin_get_collection(uuid), public.admin_save_collection(jsonb),
  public.admin_submissions(public.submission_status), public.admin_update_submission(uuid, public.submission_status, text),
  public.admin_messages(text), public.admin_update_message(uuid, text),
  public.admin_analytics(integer), public.admin_newsletter(), public.admin_save_settings(jsonb)
to authenticated;
