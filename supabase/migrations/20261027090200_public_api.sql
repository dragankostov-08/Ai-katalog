-- AI KATALOG — public read API.
-- All functions are SECURITY INVOKER: Row Level Security still applies, the
-- explicit status filters are an additional, intentional guard.
-- `p_preview` lets signed-in staff preview unpublished records; for everyone
-- else it has no effect because RLS hides those rows.

-- Builds a prefix-matching tsquery from free text ("chat gp" -> 'chat':* & 'gp':*).
create or replace function public.prefix_tsquery(p_text text)
returns tsquery
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_query text;
begin
  select string_agg(quote_literal(w) || ':*', ' & ')
    into v_query
  from (
    select w
    from regexp_split_to_table(
      lower(regexp_replace(coalesce(p_text, ''), '[&|!():*<>''"\\\[\]{}.,;?/+=~^%$#@_-]', ' ', 'g')),
      '\s+'
    ) as w
    where w <> ''
    limit 8
  ) words;

  if v_query is null then
    return null;
  end if;
  return to_tsquery('simple', v_query);
exception when others then
  return plainto_tsquery('simple', p_text);
end;
$$;

create or replace function public.escape_like(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(p_text, '\', '\\'), '%', '\%'), '_', '\_');
$$;

create or replace function public.reading_minutes(p_text text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(1, ceil(coalesce(array_length(regexp_split_to_array(trim(coalesce(p_text, '')), '\s+'), 1), 0) / 200.0)::integer);
$$;

create or replace function public.can_see(p_status public.content_status, p_preview boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status = 'published' or (coalesce(p_preview, false) and public.is_staff());
$$;

-- Compact representation used by every tool listing.
create or replace function public.tool_card(t public.tools)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'name', t.name,
    'short_description', t.short_description,
    'logo_url', t.logo_url,
    'website_url', t.website_url,
    'pricing_type', t.pricing_type,
    'has_free_plan', t.has_free_plan,
    'starting_price', t.starting_price,
    'currency', t.currency,
    'price_period', t.price_period,
    'verification_status', t.verification_status,
    'last_verified_at', t.last_verified_at,
    'is_featured', t.is_featured,
    'is_sponsored', t.is_sponsored,
    'published_at', t.published_at,
    'category', (
      select jsonb_build_object('slug', c.slug, 'name', c.name, 'accent', c.accent, 'icon', c.icon)
      from public.categories c
      where c.id = t.primary_category_id and c.status = 'published'
    )
  );
$$;

create or replace function public.article_card(a public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'slug', a.slug,
    'title', a.title,
    'excerpt', a.excerpt,
    'cover_image_url', a.cover_image_url,
    'cover_image_alt', a.cover_image_alt,
    'author_name', a.author_name,
    'published_at', a.published_at,
    'updated_at', a.updated_at,
    'reading_minutes', public.reading_minutes(a.content),
    'category', (
      select jsonb_build_object('slug', c.slug, 'name', c.name, 'accent', c.accent)
      from public.categories c
      where c.id = a.category_id and c.status = 'published'
    )
  );
$$;

create or replace function public.comparison_card(c public.comparisons)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'introduction', left(c.introduction, 320),
    'published_at', c.published_at,
    'updated_at', c.updated_at,
    'tools', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name, 'logo_url', t.logo_url) order by ct.position, t.name)
      from public.comparison_tools ct
      join public.tools t on t.id = ct.tool_id and t.status = 'published'
      where ct.comparison_id = c.id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.collection_card(c public.collections)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'title', c.title,
    'description', c.description,
    'published_at', c.published_at,
    'updated_at', c.updated_at,
    'tool_count', (
      select count(*) from public.collection_tools ct
      join public.tools t on t.id = ct.tool_id and t.status = 'published'
      where ct.collection_id = c.id
    ),
    'tools', coalesce((
      select jsonb_agg(x.card order by x.position)
      from (
        select jsonb_build_object('slug', t.slug, 'name', t.name, 'logo_url', t.logo_url) as card, ct.position
        from public.collection_tools ct
        join public.tools t on t.id = ct.tool_id and t.status = 'published'
        where ct.collection_id = c.id
        order by ct.position
        limit 5
      ) x
    ), '[]'::jsonb)
  );
$$;

-- Comparisons need at least two published tools to be useful.
create or replace function public.comparison_is_complete(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (
    select count(*) from public.comparison_tools ct
    join public.tools t on t.id = ct.tool_id and t.status = 'published'
    where ct.comparison_id = p_id
  ) >= 2;
$$;

create or replace function public.collection_is_complete(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.collection_tools ct
    join public.tools t on t.id = ct.tool_id and t.status = 'published'
    where ct.collection_id = p_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Site-wide data: settings, categories (with published tool counts), use cases
-- ---------------------------------------------------------------------------

create or replace function public.api_site()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce((select jsonb_object_agg(s.key, s.value) from public.site_settings s where s.value <> ''), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(x.obj order by x.sort_order, x.name)
      from (
        select c.sort_order, c.name, jsonb_build_object(
          'id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description,
          'icon', c.icon, 'accent', c.accent,
          'tool_count', (
            select count(*) from public.tool_categories tc
            join public.tools t on t.id = tc.tool_id and t.status = 'published'
            where tc.category_id = c.id
          )
        ) as obj
        from public.categories c
        where c.status = 'published'
      ) x
    ), '[]'::jsonb),
    'use_cases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id, 'slug', u.slug, 'name', u.name, 'task_label', u.task_label, 'description', u.description
      ) order by u.sort_order, u.name)
      from public.use_cases u
      where u.status = 'published'
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Home page
-- ---------------------------------------------------------------------------

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
        where status = 'published' and public.collection_is_complete(id)
        order by is_featured desc, published_at desc limit 3
      ) c
    ), '[]'::jsonb),
    'articles', coalesce((
      select jsonb_agg(public.article_card(a) order by a.is_featured desc, a.published_at desc)
      from (select * from public.articles where status = 'published' order by is_featured desc, published_at desc limit 4) a
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
-- Directory search with filters, sorting and pagination
-- ---------------------------------------------------------------------------

create or replace function public.api_search_tools(
  p_query text default null,
  p_category text default null,
  p_use_case text default null,
  p_pricing text[] default null,
  p_free_plan boolean default null,
  p_platform text default null,
  p_sort text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_query text := nullif(left(trim(coalesce(p_query, '')), 100), '');
  v_tsq tsquery;
  v_like text;
  v_limit integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 5000);
  v_sort text := coalesce(nullif(p_sort, ''), case when v_query is null then 'featured' else 'relevance' end);
  v_result jsonb;
begin
  if v_query is not null then
    v_tsq := public.prefix_tsquery(v_query);
    v_like := '%' || public.escape_like(v_query) || '%';
  end if;

  with filtered as (
    select
      t.id,
      t.is_featured,
      t.name,
      t.published_at,
      case
        when v_query is null then 0
        else coalesce(ts_rank(t.search_vector, v_tsq), 0)
             + case when lower(t.name) = lower(v_query) then 2 else 0 end
             + case when t.name ilike public.escape_like(v_query) || '%' then 1 else 0 end
      end as rank
    from public.tools t
    where t.status = 'published'
      and (
        v_query is null
        or (v_tsq is not null and t.search_vector @@ v_tsq)
        or t.name ilike v_like
        or exists (
          select 1 from public.tool_categories tc
          join public.categories c on c.id = tc.category_id and c.status = 'published'
          where tc.tool_id = t.id and c.name ilike v_like
        )
        or exists (
          select 1 from public.tool_use_cases tu
          join public.use_cases u on u.id = tu.use_case_id and u.status = 'published'
          where tu.tool_id = t.id and (u.name ilike v_like or u.task_label ilike v_like)
        )
      )
      and (
        p_category is null or exists (
          select 1 from public.tool_categories tc
          join public.categories c on c.id = tc.category_id and c.status = 'published'
          where tc.tool_id = t.id and c.slug = p_category
        )
      )
      and (
        p_use_case is null or exists (
          select 1 from public.tool_use_cases tu
          join public.use_cases u on u.id = tu.use_case_id and u.status = 'published'
          where tu.tool_id = t.id and u.slug = p_use_case
        )
      )
      and (p_pricing is null or cardinality(p_pricing) = 0 or t.pricing_type::text = any (p_pricing))
      and (p_free_plan is null or t.has_free_plan = p_free_plan)
      and (p_platform is null or p_platform = any (t.platforms))
  ),
  page as (
    select f.id, row_number() over (
      order by
        case when v_sort = 'relevance' then f.rank end desc nulls last,
        case when v_sort = 'featured' then f.is_featured end desc nulls last,
        case when v_sort = 'name' then lower(f.name) end asc nulls last,
        f.published_at desc nulls last,
        f.name asc
    ) as ord
    from filtered f
    order by ord
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'limit', v_limit,
    'offset', v_offset,
    'items', coalesce((
      select jsonb_agg(public.tool_card(t) order by p.ord)
      from page p join public.tools t on t.id = p.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Category page
-- ---------------------------------------------------------------------------

create or replace function public.api_category(p_slug text, p_preview boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'category', jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'intro', c.intro,
      'icon', c.icon, 'accent', c.accent, 'seo_title', c.seo_title, 'seo_description', c.seo_description,
      'status', c.status, 'updated_at', c.updated_at
    ),
    'tool_count', (
      select count(*) from public.tool_categories tc
      join public.tools t on t.id = tc.tool_id and t.status = 'published'
      where tc.category_id = c.id
    ),
    'articles', coalesce((
      select jsonb_agg(public.article_card(a) order by a.published_at desc)
      from (
        select * from public.articles a
        where a.status = 'published'
          and (a.category_id = c.id or exists (
            select 1 from public.article_tools at
            join public.tool_categories tc on tc.tool_id = at.tool_id
            where at.article_id = a.id and tc.category_id = c.id
          ))
        order by a.published_at desc limit 3
      ) a
    ), '[]'::jsonb),
    'comparisons', coalesce((
      select jsonb_agg(public.comparison_card(x) order by x.published_at desc)
      from (
        select * from public.comparisons cm
        where cm.status = 'published' and public.comparison_is_complete(cm.id)
          and exists (
            select 1 from public.comparison_tools ct
            join public.tool_categories tc on tc.tool_id = ct.tool_id
            where ct.comparison_id = cm.id and tc.category_id = c.id
          )
        order by cm.published_at desc limit 3
      ) x
    ), '[]'::jsonb)
  )
  from public.categories c
  where c.slug = p_slug and public.can_see(c.status, p_preview);
$$;

-- ---------------------------------------------------------------------------
-- Tool profile
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
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create or replace function public.api_articles(p_limit integer default 12, p_offset integer default 0)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.articles where status = 'published'),
    'items', coalesce((
      select jsonb_agg(public.article_card(a) order by a.published_at desc)
      from (
        select * from public.articles where status = 'published'
        order by published_at desc
        limit least(greatest(coalesce(p_limit, 12), 1), 48)
        offset least(greatest(coalesce(p_offset, 0), 0), 5000)
      ) a
    ), '[]'::jsonb)
  );
$$;

create or replace function public.api_article(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  a public.articles;
begin
  select * into a from public.articles x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'article', public.article_card(a) || jsonb_build_object(
      'content', a.content,
      'cover_caption', a.cover_caption,
      'seo_title', a.seo_title,
      'seo_description', a.seo_description,
      'status', a.status
    ),
    'tools', coalesce((
      select jsonb_agg(public.tool_card(t) order by x.position, t.name)
      from public.article_tools x
      join public.tools t on t.id = x.tool_id and t.status = 'published'
      where x.article_id = a.id
    ), '[]'::jsonb),
    'related', coalesce((
      select jsonb_agg(public.article_card(r.o) order by r.shared desc, (r.o).published_at desc)
      from (
        select o, (
          select count(*) from public.article_tools x
          join public.article_tools y on y.tool_id = x.tool_id
          where x.article_id = a.id and y.article_id = o.id
        ) + case when o.category_id = a.category_id then 1 else 0 end as shared
        from public.articles o
        where o.status = 'published' and o.id <> a.id
        order by shared desc, o.published_at desc
        limit 3
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Comparisons
-- ---------------------------------------------------------------------------

create or replace function public.api_comparisons()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(public.comparison_card(c) order by c.is_featured desc, c.published_at desc)
    from public.comparisons c
    where c.status = 'published' and public.comparison_is_complete(c.id)
  ), '[]'::jsonb);
$$;

create or replace function public.api_comparison(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.comparisons;
begin
  select * into c from public.comparisons x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'comparison', jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'title', c.title, 'introduction', c.introduction,
      'verdict', c.verdict, 'criteria', c.criteria, 'seo_title', c.seo_title,
      'seo_description', c.seo_description, 'status', c.status,
      'published_at', c.published_at, 'updated_at', c.updated_at
    ),
    'tools', coalesce((
      select jsonb_agg(
        public.tool_card(t) || jsonb_build_object(
          'free_plan_limits', t.free_plan_limits,
          'platforms', to_jsonb(t.platforms),
          'pricing_notes', t.pricing_notes,
          'strengths', ct.strengths,
          'limitations', ct.limitations,
          'best_for', ct.best_for,
          'features', coalesce((
            select jsonb_agg(f.feature_name || coalesce(': ' || f.feature_value, '') order by f.sort_order)
            from (select * from public.tool_features ff where ff.tool_id = t.id order by ff.sort_order limit 6) f
          ), '[]'::jsonb)
        ) order by ct.position, t.name)
      from public.comparison_tools ct
      join public.tools t on t.id = ct.tool_id and public.can_see(t.status, p_preview)
      where ct.comparison_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------

create or replace function public.api_collections()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(public.collection_card(c) order by c.is_featured desc, c.published_at desc)
    from public.collections c
    where c.status = 'published' and public.collection_is_complete(c.id)
  ), '[]'::jsonb);
$$;

create or replace function public.api_collection(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.collections;
begin
  select * into c from public.collections x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'collection', jsonb_build_object(
      'id', c.id, 'slug', c.slug, 'title', c.title, 'description', c.description,
      'intro', c.intro, 'methodology', c.methodology, 'seo_title', c.seo_title,
      'seo_description', c.seo_description, 'status', c.status,
      'published_at', c.published_at, 'updated_at', c.updated_at
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', ct.position,
        'editorial_reason', ct.editorial_reason,
        'is_sponsored', ct.is_sponsored,
        'tool', public.tool_card(t) || jsonb_build_object('free_plan_limits', t.free_plan_limits, 'best_for', t.best_for)
      ) order by ct.position, t.name)
      from public.collection_tools ct
      join public.tools t on t.id = ct.tool_id and public.can_see(t.status, p_preview)
      where ct.collection_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Discovery wizard: the attributes needed for transparent, rule-based scoring.
-- ---------------------------------------------------------------------------

create or replace function public.api_wizard_tools()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(
      public.tool_card(t) || jsonb_build_object(
        'free_plan_limits', t.free_plan_limits,
        'platforms', to_jsonb(t.platforms),
        'capabilities', to_jsonb(t.capabilities),
        'macedonian_support', t.macedonian_support,
        'skill_level', t.skill_level,
        'cons', to_jsonb(t.cons),
        'use_cases', coalesce((
          select jsonb_agg(u.slug)
          from public.tool_use_cases tu
          join public.use_cases u on u.id = tu.use_case_id and u.status = 'published'
          where tu.tool_id = t.id
        ), '[]'::jsonb),
        'categories', coalesce((
          select jsonb_agg(c.slug)
          from public.tool_categories tc
          join public.categories c on c.id = tc.category_id and c.status = 'published'
          where tc.tool_id = t.id
        ), '[]'::jsonb)
      ) order by t.name)
    from (select * from public.tools where status = 'published' order by name limit 2000) t
  ), '[]'::jsonb);
$$;

-- Favorites are stored in the visitor's browser; this resolves them to cards.
create or replace function public.api_tools_by_slugs(p_slugs text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(public.tool_card(t) order by array_position(p_slugs, t.slug))
    from public.tools t
    where t.status = 'published' and t.slug = any (p_slugs[1:200])
  ), '[]'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Sitemap: canonical, published, non-empty pages only.
-- ---------------------------------------------------------------------------

create or replace function public.api_sitemap()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'tools', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by slug)
      from public.tools where status = 'published'
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'updated_at', c.updated_at) order by c.sort_order)
      from public.categories c
      where c.status = 'published' and exists (
        select 1 from public.tool_categories tc
        join public.tools t on t.id = tc.tool_id and t.status = 'published'
        where tc.category_id = c.id
      )
    ), '[]'::jsonb),
    'articles', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by published_at desc)
      from public.articles where status = 'published'
    ), '[]'::jsonb),
    'comparisons', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by published_at desc)
      from public.comparisons c where status = 'published' and public.comparison_is_complete(c.id)
    ), '[]'::jsonb),
    'collections', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by published_at desc)
      from public.collections c where status = 'published' and public.collection_is_complete(c.id)
    ), '[]'::jsonb)
  );
$$;

grant execute on function
  public.prefix_tsquery(text),
  public.escape_like(text),
  public.reading_minutes(text),
  public.can_see(public.content_status, boolean),
  public.tool_card(public.tools),
  public.article_card(public.articles),
  public.comparison_card(public.comparisons),
  public.collection_card(public.collections),
  public.comparison_is_complete(uuid),
  public.collection_is_complete(uuid),
  public.api_site(),
  public.api_home(),
  public.api_search_tools(text, text, text, text[], boolean, text, text, integer, integer),
  public.api_category(text, boolean),
  public.api_tool(text, boolean),
  public.api_articles(integer, integer),
  public.api_article(text, boolean),
  public.api_comparisons(),
  public.api_comparison(text, boolean),
  public.api_collections(),
  public.api_collection(text, boolean),
  public.api_wizard_tools(),
  public.api_tools_by_slugs(text[]),
  public.api_sitemap()
to anon, authenticated;
