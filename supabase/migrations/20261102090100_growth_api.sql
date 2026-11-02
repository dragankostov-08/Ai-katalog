-- AI KATALOG — growth features, part 2: functions.
-- Public reads are SECURITY INVOKER (RLS applies). Visitor actions are
-- SECURITY DEFINER with validation and rate limits. The e-mail queue is only
-- reachable by the service role (the `send-notifications` Edge Function).

-- ---------------------------------------------------------------------------
-- Helpers and cards
-- ---------------------------------------------------------------------------

create or replace function public.has_free_access(t public.tools)
returns boolean
language sql
stable
set search_path = ''
as $$
  select t.pricing_type in ('free', 'open_source', 'freemium') or t.has_free_plan is true;
$$;

-- Published tools with free access that share a category or use case.
create or replace function public.free_alternatives_count(p_tool_id uuid, p_verified_only boolean)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.tools o
  where o.status = 'published' and o.id <> p_tool_id
    and public.has_free_access(o)
    and (not p_verified_only or o.verification_status = 'verified')
    and (
      exists (select 1 from public.tool_categories a join public.tool_categories b on b.category_id = a.category_id where a.tool_id = p_tool_id and b.tool_id = o.id)
      or exists (select 1 from public.tool_use_cases a join public.tool_use_cases b on b.use_case_id = a.use_case_id where a.tool_id = p_tool_id and b.tool_id = o.id)
    );
$$;

create or replace function public.prompt_card(p public.prompts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'title', p.title, 'summary', p.summary,
    'preview', left(p.prompt_text, 240), 'skill_level', p.skill_level,
    'is_featured', p.is_featured, 'published_at', p.published_at, 'updated_at', p.updated_at,
    'use_case', (select jsonb_build_object('slug', u.slug, 'name', u.name) from public.use_cases u where u.id = p.use_case_id and u.status = 'published'),
    'tools', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name) order by pt.position, t.name)
      from public.prompt_tools pt join public.tools t on t.id = pt.tool_id and t.status = 'published'
      where pt.prompt_id = p.id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.language_test_json(lt public.language_tests)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', lt.id, 'task_title', lt.task_title, 'prompt_used', lt.prompt_used, 'output_excerpt', lt.output_excerpt,
    'verdict', lt.verdict, 'notes', lt.notes, 'plan_tested', lt.plan_tested, 'model_version', lt.model_version,
    'tested_at', lt.tested_at, 'screenshot_url', lt.screenshot_url, 'screenshot_alt', lt.screenshot_alt
  );
$$;

create or replace function public.learning_path_card(lp public.learning_paths)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', lp.id, 'slug', lp.slug, 'title', lp.title, 'summary', lp.summary, 'level', lp.level,
    'estimated_days', lp.estimated_days, 'is_featured', lp.is_featured, 'updated_at', lp.updated_at,
    'step_count', (select count(*) from public.learning_path_steps s where s.path_id = lp.id),
    'total_minutes', (select coalesce(sum(s.estimated_minutes), 0) from public.learning_path_steps s where s.path_id = lp.id)
  );
$$;

-- collection cards now carry the collection kind and audience label.
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
    'kind', c.kind,
    'audience_label', c.audience_label,
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

-- ---------------------------------------------------------------------------
-- Public API: prompts
-- ---------------------------------------------------------------------------

create or replace function public.api_prompts(
  p_query text default null,
  p_use_case text default null,
  p_tool text default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with f as (
    select p.* from public.prompts p
    where p.status = 'published'
      and (nullif(trim(coalesce(p_query, '')), '') is null
           or p.title ilike '%' || public.escape_like(trim(p_query)) || '%'
           or p.summary ilike '%' || public.escape_like(trim(p_query)) || '%'
           or p.prompt_text ilike '%' || public.escape_like(trim(p_query)) || '%')
      and (p_use_case is null or exists (select 1 from public.use_cases u where u.id = p.use_case_id and u.slug = p_use_case))
      and (p_tool is null or exists (
        select 1 from public.prompt_tools pt join public.tools t on t.id = pt.tool_id and t.status = 'published'
        where pt.prompt_id = p.id and t.slug = p_tool))
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'items', coalesce((
      select jsonb_agg(public.prompt_card(x) order by x.is_featured desc, x.published_at desc, x.title)
      from (
        select * from f order by is_featured desc, published_at desc, title
        limit least(greatest(coalesce(p_limit, 24), 1), 60) offset least(greatest(coalesce(p_offset, 0), 0), 5000)
      ) x
    ), '[]'::jsonb)
  );
$$;

create or replace function public.api_prompt(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p public.prompts;
begin
  select * into p from public.prompts x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'prompt', public.prompt_card(p) || jsonb_build_object(
      'prompt_text', p.prompt_text, 'how_to_use', p.how_to_use, 'example_output', p.example_output,
      'seo_title', p.seo_title, 'seo_description', p.seo_description, 'status', p.status
    ),
    'tools', coalesce((
      select jsonb_agg(public.tool_card(t) order by pt.position, t.name)
      from public.prompt_tools pt join public.tools t on t.id = pt.tool_id and t.status = 'published'
      where pt.prompt_id = p.id
    ), '[]'::jsonb),
    'related', coalesce((
      select jsonb_agg(public.prompt_card(r) order by r.published_at desc)
      from (
        select * from public.prompts r
        where r.status = 'published' and r.id <> p.id
          and (r.use_case_id = p.use_case_id or r.category_id = p.category_id)
        order by r.published_at desc limit 4
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API: glossary
-- ---------------------------------------------------------------------------

create or replace function public.api_glossary()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('slug', g.slug, 'term', g.term, 'english_term', g.english_term, 'short_definition', g.short_definition) order by lower(g.term))
    from public.glossary_terms g where g.status = 'published'
  ), '[]'::jsonb);
$$;

create or replace function public.api_glossary_term(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  g public.glossary_terms;
begin
  select * into g from public.glossary_terms x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'term', jsonb_build_object(
      'id', g.id, 'slug', g.slug, 'term', g.term, 'english_term', g.english_term, 'short_definition', g.short_definition,
      'body', g.body, 'seo_title', g.seo_title, 'seo_description', g.seo_description, 'status', g.status, 'updated_at', g.updated_at
    ),
    'related', coalesce((
      select jsonb_agg(jsonb_build_object('slug', r.slug, 'term', r.term, 'short_definition', r.short_definition) order by lower(r.term))
      from public.glossary_terms r
      where r.status = 'published' and r.id in (
        select related_term_id from public.glossary_links where term_id = g.id
        union select term_id from public.glossary_links where related_term_id = g.id
      )
    ), '[]'::jsonb),
    'tools', coalesce((
      select jsonb_agg(public.tool_card(t) order by t.name)
      from public.glossary_tools gt join public.tools t on t.id = gt.tool_id and t.status = 'published'
      where gt.term_id = g.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API: „Тестирано на македонски“
-- ---------------------------------------------------------------------------

create or replace function public.api_language_tests()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(g.obj order by g.latest desc)
    from (
      select lower(lt.task_title) as task_key, max(lt.tested_at) as latest,
        jsonb_build_object(
          'task_title', min(lt.task_title),
          'prompt_used', (array_agg(lt.prompt_used order by lt.tested_at desc))[1],
          'results', jsonb_agg(
            public.language_test_json(lt) || jsonb_build_object('tool', public.tool_card(t))
            order by array_position(array['excellent', 'good', 'mixed', 'poor'], lt.verdict), t.name)
        ) as obj
      from public.language_tests lt
      join public.tools t on t.id = lt.tool_id and t.status = 'published'
      where lt.status = 'published'
      group by lower(lt.task_title)
    ) g
  ), '[]'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Public API: free alternatives
-- ---------------------------------------------------------------------------

create or replace function public.api_alternatives(p_slug text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  t public.tools;
begin
  select * into t from public.tools x where x.slug = p_slug and x.status = 'published';
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'tool', public.tool_card(t),
    'alternatives', coalesce((
      select jsonb_agg(public.tool_card(r.o) || jsonb_build_object('free_plan_limits', (r.o).free_plan_limits, 'shared', r.score)
        order by ((r.o).verification_status = 'verified') desc, r.score desc, (r.o).name)
      from (
        select o, (
          (select count(*) from public.tool_categories a join public.tool_categories b on b.category_id = a.category_id where a.tool_id = t.id and b.tool_id = o.id) * 2
          + (select count(*) from public.tool_use_cases a join public.tool_use_cases b on b.use_case_id = a.use_case_id where a.tool_id = t.id and b.tool_id = o.id)
        ) as score
        from public.tools o
        where o.status = 'published' and o.id <> t.id and public.has_free_access(o)
      ) r
      where r.score > 0
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.api_alternatives_index()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(x.obj order by x.verified desc, x.name)
    from (
      select t.name, public.free_alternatives_count(t.id, true) as verified,
        public.tool_card(t) || jsonb_build_object(
          'verified_alternatives', public.free_alternatives_count(t.id, true),
          'all_alternatives', public.free_alternatives_count(t.id, false)
        ) as obj
      from public.tools t
      where t.status = 'published' and public.free_alternatives_count(t.id, false) > 0
    ) x
  ), '[]'::jsonb);
$$;

-- ---------------------------------------------------------------------------
-- Public API: compare any 2–4 tools
-- ---------------------------------------------------------------------------

create or replace function public.api_compare_tools(p_slugs text[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  with chosen as (
    select t.* from public.tools t
    where t.status = 'published' and t.slug = any (p_slugs[1:4])
  )
  select jsonb_build_object(
    'tools', coalesce((
      select jsonb_agg(public.tool_card(c) || jsonb_build_object(
        'platforms', to_jsonb(c.platforms), 'capabilities', to_jsonb(c.capabilities),
        'macedonian_support', c.macedonian_support, 'skill_level', c.skill_level,
        'free_plan_limits', c.free_plan_limits, 'pricing_notes', c.pricing_notes, 'best_for', c.best_for,
        'pros', to_jsonb(c.pros), 'cons', to_jsonb(c.cons), 'developer', c.developer,
        'features', coalesce((
          select jsonb_agg(f.feature_name || coalesce(': ' || f.feature_value, '') order by f.sort_order)
          from (select * from public.tool_features ff where ff.tool_id = c.id order by ff.sort_order limit 8) f
        ), '[]'::jsonb),
        'use_cases', coalesce((
          select jsonb_agg(u.name order by u.sort_order) from public.tool_use_cases tu
          join public.use_cases u on u.id = tu.use_case_id and u.status = 'published' where tu.tool_id = c.id
        ), '[]'::jsonb),
        'language_verdict', (
          select lt.verdict from public.language_tests lt
          where lt.tool_id = c.id and lt.status = 'published' order by lt.tested_at desc limit 1
        )
      ) order by array_position(p_slugs, c.slug))
      from chosen c
    ), '[]'::jsonb),
    'comparisons', coalesce((
      select jsonb_agg(public.comparison_card(cm) order by cm.published_at desc)
      from public.comparisons cm
      where cm.status = 'published' and public.comparison_is_complete(cm.id)
        and (select count(*) from public.comparison_tools ct join chosen ch on ch.id = ct.tool_id where ct.comparison_id = cm.id) >= 2
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Public API: learning paths
-- ---------------------------------------------------------------------------

create or replace function public.api_learning_paths()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(public.learning_path_card(lp) order by lp.is_featured desc, lp.published_at desc)
    from public.learning_paths lp
    where lp.status = 'published' and exists (select 1 from public.learning_path_steps s where s.path_id = lp.id)
  ), '[]'::jsonb);
$$;

create or replace function public.api_learning_path(p_slug text, p_preview boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  lp public.learning_paths;
begin
  select * into lp from public.learning_paths x where x.slug = p_slug and public.can_see(x.status, p_preview);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'path', public.learning_path_card(lp) || jsonb_build_object(
      'intro', lp.intro, 'seo_title', lp.seo_title, 'seo_description', lp.seo_description, 'status', lp.status
    ),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', s.title, 'body', s.body, 'step_type', s.step_type, 'estimated_minutes', s.estimated_minutes,
        'article', (select public.article_card(a) from public.articles a where a.id = s.article_id and a.status = 'published'),
        'tool', (select public.tool_card(t) from public.tools t where t.id = s.tool_id and t.status = 'published'),
        'prompt', (select public.prompt_card(p) || jsonb_build_object('prompt_text', p.prompt_text) from public.prompts p where p.id = s.prompt_id and p.status = 'published'),
        'video', (
          select jsonb_build_object('id', v.id, 'youtube_id', v.youtube_id, 'title', v.title, 'channel_title', v.channel_title,
            'language', v.language, 'duration_seconds', v.duration_seconds, 'note', v.note, 'video_published_at', v.video_published_at)
          from public.tool_videos v join public.tools vt on vt.id = v.tool_id and vt.status = 'published'
          where v.id = s.video_id and v.is_visible
        )
      ) order by s.position, s.title)
      from public.learning_path_steps s where s.path_id = lp.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Redefined public functions
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
    ), '[]'::jsonb),
    'prompts', coalesce((
      select jsonb_agg(public.prompt_card(p) order by p.is_featured desc, p.published_at desc)
      from (
        select p.* from public.prompts p
        join public.prompt_tools pt on pt.prompt_id = p.id and pt.tool_id = t.id
        where p.status = 'published'
        order by p.is_featured desc, p.published_at desc limit 6
      ) p
    ), '[]'::jsonb),
    'language_tests', coalesce((
      select jsonb_agg(public.language_test_json(lt) order by lt.tested_at desc)
      from public.language_tests lt
      where lt.tool_id = t.id and lt.status = 'published'
    ), '[]'::jsonb),
    'free_alternative_count', (
      select count(*) from public.tools o
      where o.status = 'published' and o.id <> t.id
        and public.has_free_access(o)
        and o.verification_status = 'verified'
        and (
          exists (select 1 from public.tool_categories a join public.tool_categories b on b.category_id = a.category_id where a.tool_id = t.id and b.tool_id = o.id)
          or exists (select 1 from public.tool_use_cases a join public.tool_use_cases b on b.use_case_id = a.use_case_id where a.tool_id = t.id and b.tool_id = o.id)
        )
    )
  );
end;
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
    ), '[]'::jsonb),
    'prompts', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by published_at desc)
      from public.prompts where status = 'published'
    ), '[]'::jsonb),
    'glossary', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by slug)
      from public.glossary_terms where status = 'published'
    ), '[]'::jsonb),
    'learning_paths', coalesce((
      select jsonb_agg(jsonb_build_object('slug', slug, 'updated_at', updated_at) order by published_at desc)
      from public.learning_paths lp
      where status = 'published' and exists (select 1 from public.learning_path_steps s where s.path_id = lp.id)
    ), '[]'::jsonb),
    'alternatives', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug, 'updated_at', t.updated_at) order by t.slug)
      from public.tools t
      where t.status = 'published' and public.free_alternatives_count(t.id, true) > 0
    ), '[]'::jsonb),
    'has_language_tests', exists (
      select 1 from public.language_tests lt join public.tools t on t.id = lt.tool_id
      where lt.status = 'published' and t.status = 'published'
    )
  );
$$;


-- ---------------------------------------------------------------------------
-- Price-change alerts: double opt-in, HMAC links, verified changes only
-- ---------------------------------------------------------------------------

create or replace function private.watch_token(p_id uuid, p_purpose text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(extensions.hmac(
    p_id::text || ':' || p_purpose,
    (select s.value from private.app_secrets s where s.name = 'watch_secret'),
    'sha256'
  ), 'hex');
$$;

create or replace function private.enqueue_watch_confirmation(p_watcher public.tool_watchers, p_tool public.tools)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_queue (kind, email, payload, dedupe_key)
  values (
    'watch_confirm', p_watcher.email,
    jsonb_build_object(
      'watcher_id', p_watcher.id, 'tool_name', p_tool.name, 'tool_slug', p_tool.slug,
      'confirm_token', private.watch_token(p_watcher.id, 'confirm'),
      'unsubscribe_token', private.watch_token(p_watcher.id, 'unsubscribe')
    ),
    'confirm:' || p_watcher.id || ':' || to_char(now(), 'YYYYMMDDHH24')
  )
  on conflict (dedupe_key) do nothing;
$$;

create or replace function public.watch_tool(p_tool_slug text, p_email text, p_consent boolean, p_website text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_tool public.tools;
  v_watcher public.tool_watchers;
  v_ok jsonb := jsonb_build_object('ok', true);
begin
  if coalesce(p_website, '') <> '' then
    return v_ok;
  end if;
  if p_consent is distinct from true then
    return jsonb_build_object('ok', false, 'error', 'consent_required', 'message', 'Потребна е твоја согласност.');
  end if;
  if not private.is_valid_email(v_email) then
    return jsonb_build_object('ok', false, 'error', 'invalid_email', 'message', 'Е-поштата не е валидна.');
  end if;
  if not private.allow_action('watch', 5, interval '1 hour') then
    return private.rate_limited();
  end if;
  select * into v_tool from public.tools where slug = p_tool_slug and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Алатката не постои.');
  end if;
  if (select count(*) from public.tool_watchers where lower(email) = v_email and status <> 'unsubscribed') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'too_many', 'message', 'Следиш премногу алатки со оваа адреса.');
  end if;

  select * into v_watcher from public.tool_watchers where tool_id = v_tool.id and lower(email) = v_email;
  if not found then
    insert into public.tool_watchers (tool_id, email, consent_at) values (v_tool.id, v_email, now()) returning * into v_watcher;
  elsif v_watcher.status = 'unsubscribed' then
    update public.tool_watchers set status = 'pending', consent_at = now(), unsubscribed_at = null
    where id = v_watcher.id returning * into v_watcher;
  elsif v_watcher.status = 'active' then
    -- Same response as for a new address: do not reveal who follows what.
    return v_ok;
  end if;

  perform private.enqueue_watch_confirmation(v_watcher, v_tool);
  return v_ok;
end;
$$;

create or replace function public.confirm_watch(p_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tool public.tools;
begin
  if not private.allow_action('watch_confirm', 30, interval '1 hour') then
    return private.rate_limited();
  end if;
  if p_token is null or p_token <> private.watch_token(p_id, 'confirm') then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'message', 'Линкот за потврда не е валиден.');
  end if;
  update public.tool_watchers set status = 'active', confirmed_at = coalesce(confirmed_at, now())
  where id = p_id and status in ('pending', 'active');
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'message', 'Следењето е откажано. Пријави се повторно од страницата на алатката.');
  end if;
  select t.* into v_tool from public.tools t join public.tool_watchers w on w.tool_id = t.id where w.id = p_id;
  return jsonb_build_object('ok', true, 'tool_name', v_tool.name, 'tool_slug', v_tool.slug);
end;
$$;

create or replace function public.unwatch_tool(p_id uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.allow_action('watch_confirm', 30, interval '1 hour') then
    return private.rate_limited();
  end if;
  if p_token is null or p_token <> private.watch_token(p_id, 'unsubscribe') then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'message', 'Линкот за одјава не е валиден.');
  end if;
  update public.tool_watchers set status = 'unsubscribed', unsubscribed_at = now() where id = p_id and status <> 'unsubscribed';
  update public.notification_queue set status = 'cancelled'
  where status in ('pending', 'failed') and payload ->> 'watcher_id' = p_id::text;
  return jsonb_build_object('ok', true);
end;
$$;

-- Called when an editor verifies a tool: queues one alert per active watcher
-- summarising pricing changes logged since the previous verification.
create or replace function public.notify_price_watchers(p_tool_id uuid, p_since timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb;
  v_tool public.tools;
  v_count integer;
begin
  perform public.assert_staff();
  select * into v_tool from public.tools where id = p_tool_id;
  if v_tool.status <> 'published' then
    return 0;
  end if;
  select jsonb_agg(jsonb_build_object('field', u.field_changed, 'old', u.old_value, 'new', u.new_value) order by u.verified_at)
    into v_changes
  from public.tool_updates u
  where u.tool_id = p_tool_id
    and u.verified_at > coalesce(p_since, '-infinity'::timestamptz)
    and u.field_changed in ('pricing_type', 'starting_price', 'currency', 'price_period', 'has_free_plan', 'free_plan_limits');
  if v_changes is null then
    return 0;
  end if;

  insert into public.notification_queue (kind, email, payload, dedupe_key)
  select 'price_change', w.email,
    jsonb_build_object(
      'watcher_id', w.id, 'tool_name', v_tool.name, 'tool_slug', v_tool.slug, 'changes', v_changes,
      'verified_at', now(), 'unsubscribe_token', private.watch_token(w.id, 'unsubscribe')
    ),
    'price:' || w.id || ':' || to_char(now(), 'YYYYMMDD')
  from public.tool_watchers w
  where w.tool_id = p_tool_id and w.status = 'active'
  on conflict (dedupe_key) do update
    set payload = excluded.payload, status = 'pending', attempts = 0
    where public.notification_queue.status in ('pending', 'failed');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service role only: the sender claims and completes queued e-mails.
-- ---------------------------------------------------------------------------

create or replace function public.claim_notifications(p_limit integer default 20)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select id from public.notification_queue
    where (status = 'pending' or (status = 'failed' and attempts < 3 and updated_at < now() - interval '10 minutes'))
       or (status = 'sending' and updated_at < now() - interval '15 minutes')
    order by created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  ), claimed as (
    update public.notification_queue q set status = 'sending', attempts = q.attempts + 1
    from picked where q.id = picked.id
    returning q.id, q.kind, q.email, q.payload
  )
  select coalesce(jsonb_agg(to_jsonb(claimed)), '[]'::jsonb) from claimed;
$$;

create or replace function public.complete_notification(p_id uuid, p_ok boolean, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notification_queue set
    status = case when p_ok then 'sent' when attempts >= 3 then 'failed' else 'pending' end,
    sent_at = case when p_ok then now() else sent_at end,
    last_error = case when p_ok then null else left(p_error, 500) end,
    -- Tokens are only needed until the e-mail has gone out.
    payload = case when p_ok then payload - 'confirm_token' - 'unsubscribe_token' else payload end
  where id = p_id;
$$;


-- ---------------------------------------------------------------------------
-- Admin: option lists, prompts, glossary, learning paths, language tests
-- ---------------------------------------------------------------------------

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
    'tools', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'status', status) order by lower(name)) from public.tools), '[]'::jsonb),
    'articles', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', title, 'slug', slug, 'status', status) order by lower(title)) from public.articles), '[]'::jsonb),
    'prompts', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', title, 'slug', slug, 'status', status) order by lower(title)) from public.prompts), '[]'::jsonb),
    'glossary', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', term, 'slug', slug, 'status', status) order by lower(term)) from public.glossary_terms), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', t.name || ': ' || v.title, 'slug', v.youtube_id,
        'status', case when v.is_visible then t.status else 'archived'::public.content_status end) order by lower(t.name), v.position)
      from public.tool_videos v join public.tools t on t.id = v.tool_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_prompt(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  p public.prompts;
begin
  perform public.assert_staff();
  select * into p from public.prompts where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(p) || jsonb_build_object(
    'tool_ids', coalesce((select jsonb_agg(tool_id order by position) from public.prompt_tools where prompt_id = p.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_prompt(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.prompts;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.prompts, p);
  if v_id is null then
    insert into public.prompts (title, slug, summary, prompt_text, how_to_use, example_output, use_case_id, category_id,
      skill_level, status, is_featured, seo_title, seo_description)
    values (trim(r.title), r.slug, coalesce(r.summary, ''), coalesce(r.prompt_text, ''), coalesce(r.how_to_use, ''),
      nullif(r.example_output, ''), r.use_case_id, r.category_id, r.skill_level, coalesce(r.status, 'draft'),
      coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.prompts set
      title = trim(r.title), slug = r.slug, summary = coalesce(r.summary, ''), prompt_text = coalesce(r.prompt_text, ''),
      how_to_use = coalesce(r.how_to_use, ''), example_output = nullif(r.example_output, ''), use_case_id = r.use_case_id,
      category_id = r.category_id, skill_level = r.skill_level, status = coalesce(r.status, status),
      is_featured = coalesce(r.is_featured, false), seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Промптот не е пронајден.' using errcode = 'P0002';
    end if;
  end if;
  if p ? 'tool_ids' then
    delete from public.prompt_tools where prompt_id = v_id;
    insert into public.prompt_tools (prompt_id, tool_id, position)
    select v_id, x::uuid, i from jsonb_array_elements_text(p -> 'tool_ids') with ordinality as u(x, i)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_get_glossary_term(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  g public.glossary_terms;
begin
  perform public.assert_staff();
  select * into g from public.glossary_terms where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(g) || jsonb_build_object(
    'related_ids', coalesce((select jsonb_agg(related_term_id) from public.glossary_links where term_id = g.id), '[]'::jsonb),
    'tool_ids', coalesce((select jsonb_agg(tool_id) from public.glossary_tools where term_id = g.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_glossary_term(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.glossary_terms;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.glossary_terms, p);
  if v_id is null then
    insert into public.glossary_terms (term, slug, english_term, short_definition, body, status, seo_title, seo_description)
    values (trim(r.term), r.slug, nullif(trim(coalesce(r.english_term, '')), ''), coalesce(r.short_definition, ''), coalesce(r.body, ''),
      coalesce(r.status, 'draft'), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.glossary_terms set
      term = trim(r.term), slug = r.slug, english_term = nullif(trim(coalesce(r.english_term, '')), ''),
      short_definition = coalesce(r.short_definition, ''), body = coalesce(r.body, ''), status = coalesce(r.status, status),
      seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Поимот не е пронајден.' using errcode = 'P0002';
    end if;
  end if;
  if p ? 'related_ids' then
    delete from public.glossary_links where term_id = v_id;
    insert into public.glossary_links (term_id, related_term_id)
    select v_id, x::uuid from jsonb_array_elements_text(p -> 'related_ids') x where x::uuid <> v_id
    on conflict do nothing;
  end if;
  if p ? 'tool_ids' then
    delete from public.glossary_tools where term_id = v_id;
    insert into public.glossary_tools (term_id, tool_id)
    select v_id, x::uuid from jsonb_array_elements_text(p -> 'tool_ids') x
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_get_learning_path(p_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  lp public.learning_paths;
begin
  perform public.assert_staff();
  select * into lp from public.learning_paths where id = p_id;
  if not found then
    return null;
  end if;
  return to_jsonb(lp) || jsonb_build_object(
    'steps', coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from public.learning_path_steps s where s.path_id = lp.id), '[]'::jsonb)
  );
end;
$$;

-- Steps keep their ids across saves so visitors' local progress survives edits.
create or replace function public.admin_save_learning_path(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.learning_paths;
  v_step jsonb;
  v_index bigint;
  v_keep uuid[];
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.learning_paths, p);
  if coalesce(r.status, 'draft') = 'published' and jsonb_array_length(coalesce(p -> 'steps', '[]'::jsonb)) = 0 then
    raise exception 'Патеката мора да има најмалку еден чекор.' using errcode = '23514';
  end if;
  if v_id is null then
    insert into public.learning_paths (title, slug, summary, intro, level, estimated_days, status, is_featured, seo_title, seo_description)
    values (trim(r.title), r.slug, coalesce(r.summary, ''), coalesce(r.intro, ''), r.level, r.estimated_days,
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''))
    returning id into v_id;
  else
    update public.learning_paths set
      title = trim(r.title), slug = r.slug, summary = coalesce(r.summary, ''), intro = coalesce(r.intro, ''), level = r.level,
      estimated_days = r.estimated_days, status = coalesce(r.status, status), is_featured = coalesce(r.is_featured, false),
      seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, '')
    where id = v_id;
    if not found then
      raise exception 'Патеката не е пронајдена.' using errcode = 'P0002';
    end if;
  end if;

  if p ? 'steps' then
    v_keep := array(select (s ->> 'id')::uuid from jsonb_array_elements(p -> 'steps') s where nullif(s ->> 'id', '') is not null);
    delete from public.learning_path_steps where path_id = v_id and id <> all (v_keep);
    for v_step, v_index in select s, i from jsonb_array_elements(p -> 'steps') with ordinality as x(s, i) loop
      if nullif(v_step ->> 'id', '') is not null then
        update public.learning_path_steps set
          position = v_index, title = trim(v_step ->> 'title'), body = coalesce(v_step ->> 'body', ''),
          step_type = coalesce(nullif(v_step ->> 'step_type', ''), 'read'),
          article_id = nullif(v_step ->> 'article_id', '')::uuid, tool_id = nullif(v_step ->> 'tool_id', '')::uuid,
          prompt_id = nullif(v_step ->> 'prompt_id', '')::uuid, video_id = nullif(v_step ->> 'video_id', '')::uuid,
          estimated_minutes = nullif(v_step ->> 'estimated_minutes', '')::integer
        where id = (v_step ->> 'id')::uuid and path_id = v_id;
      else
        insert into public.learning_path_steps (path_id, position, title, body, step_type, article_id, tool_id, prompt_id, video_id, estimated_minutes)
        values (v_id, v_index, trim(v_step ->> 'title'), coalesce(v_step ->> 'body', ''), coalesce(nullif(v_step ->> 'step_type', ''), 'read'),
          nullif(v_step ->> 'article_id', '')::uuid, nullif(v_step ->> 'tool_id', '')::uuid, nullif(v_step ->> 'prompt_id', '')::uuid,
          nullif(v_step ->> 'video_id', '')::uuid, nullif(v_step ->> 'estimated_minutes', '')::integer);
      end if;
    end loop;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_language_tests(p_tool_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(lt) order by lt.tested_at desc, lt.created_at desc)
    from public.language_tests lt where lt.tool_id = p_tool_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_language_test(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  r public.language_tests;
begin
  perform public.assert_staff();
  r := jsonb_populate_record(null::public.language_tests, p);
  if v_id is null then
    insert into public.language_tests (tool_id, task_title, prompt_used, output_excerpt, verdict, notes, plan_tested, model_version,
      tested_at, screenshot_url, screenshot_alt, status, tested_by)
    values (r.tool_id, trim(r.task_title), coalesce(r.prompt_used, ''), coalesce(r.output_excerpt, ''), coalesce(r.verdict, 'mixed'),
      coalesce(r.notes, ''), nullif(trim(coalesce(r.plan_tested, '')), ''), nullif(trim(coalesce(r.model_version, '')), ''),
      coalesce(r.tested_at, current_date), nullif(r.screenshot_url, ''), nullif(r.screenshot_alt, ''), coalesce(r.status, 'draft'), auth.uid())
    returning id into v_id;
  else
    update public.language_tests set
      task_title = trim(r.task_title), prompt_used = coalesce(r.prompt_used, ''), output_excerpt = coalesce(r.output_excerpt, ''),
      verdict = coalesce(r.verdict, verdict), notes = coalesce(r.notes, ''), plan_tested = nullif(trim(coalesce(r.plan_tested, '')), ''),
      model_version = nullif(trim(coalesce(r.model_version, '')), ''), tested_at = coalesce(r.tested_at, tested_at),
      screenshot_url = nullif(r.screenshot_url, ''), screenshot_alt = nullif(r.screenshot_alt, ''), status = coalesce(r.status, status)
    where id = v_id;
    if not found then
      raise exception 'Тестот не е пронајден.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_language_test(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.assert_staff();
  delete from public.language_tests where id = p_id;
  if not found then
    raise exception 'Тестот не е пронајден.' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: weekly digest for the newsletter, Viber and Telegram
-- ---------------------------------------------------------------------------

create or replace function public.admin_weekly_digest(p_days integer default 7)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 60));
begin
  perform public.assert_staff();
  return jsonb_build_object(
    'since', v_since,
    'tools', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'short_description', short_description) order by published_at desc)
      from public.tools where status = 'published' and published_at > v_since
    ), '[]'::jsonb),
    'price_changes', coalesce((
      select jsonb_agg(x order by x.name)
      from (
        select t.name, t.slug, jsonb_agg(jsonb_build_object('field', u.field_changed, 'old', u.old_value, 'new', u.new_value) order by u.verified_at) as changes
        from public.tool_updates u join public.tools t on t.id = u.tool_id and t.status = 'published'
        where u.verified_at > v_since and t.verification_status = 'verified'
          and u.field_changed in ('pricing_type', 'starting_price', 'currency', 'price_period', 'has_free_plan', 'free_plan_limits')
        group by t.name, t.slug
      ) x
    ), '[]'::jsonb),
    'articles', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'slug', slug) order by published_at desc) from public.articles where status = 'published' and published_at > v_since), '[]'::jsonb),
    'comparisons', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'slug', slug) order by published_at desc) from public.comparisons where status = 'published' and published_at > v_since), '[]'::jsonb),
    'prompts', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'slug', slug) order by published_at desc) from public.prompts where status = 'published' and published_at > v_since), '[]'::jsonb),
    'learning_paths', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'slug', slug) order by published_at desc) from public.learning_paths where status = 'published' and published_at > v_since), '[]'::jsonb),
    'glossary', coalesce((select jsonb_agg(jsonb_build_object('title', term, 'slug', slug) order by published_at desc) from public.glossary_terms where status = 'published' and published_at > v_since), '[]'::jsonb),
    'language_tests', coalesce((
      select jsonb_agg(jsonb_build_object('title', lt.task_title, 'tool', t.name, 'verdict', lt.verdict) order by lt.published_at desc)
      from public.language_tests lt join public.tools t on t.id = lt.tool_id and t.status = 'published'
      where lt.status = 'published' and lt.published_at > v_since
    ), '[]'::jsonb)
  );
end;
$$;

-- E-mail alert statistics (admin only: the queue holds addresses).
create or replace function public.admin_notification_stats()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'queue', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.notification_queue group by status) s), '{}'::jsonb),
    'watchers', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.tool_watchers group by status) s), '{}'::jsonb),
    'top_tools', coalesce((
      select jsonb_agg(x order by x.watchers desc)
      from (
        select t.name, t.slug, count(*)::integer as watchers
        from public.tool_watchers w join public.tools t on t.id = w.tool_id
        where w.status = 'active' group by t.name, t.slug order by watchers desc limit 15
      ) x
    ), '[]'::jsonb),
    'failures', coalesce((
      select jsonb_agg(jsonb_build_object('kind', kind, 'last_error', last_error, 'attempts', attempts, 'updated_at', updated_at) order by updated_at desc)
      from (select * from public.notification_queue where status = 'failed' order by updated_at desc limit 20) f
    ), '[]'::jsonb)
  );
end;
$$;


-- Redefined admin functions

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
    when 'prompts' then v_title := 'title'; v_strip := v_strip || array['how_to_use', 'example_output'];
    when 'glossary_terms' then v_title := 'term'; v_strip := v_strip || array['body'];
    when 'learning_paths' then v_title := 'title'; v_strip := v_strip || array['intro'];
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
    case when p_entity in ('categories', 'use_cases') then 'f.sort_order, f.name' when p_entity = 'glossary_terms' then 'lower(f.term)' else 'f.updated_at desc' end
  )
  into v_result
  using nullif(p_status, ''), v_query, '%' || public.escape_like(coalesce(v_query, '')) || '%',
        least(greatest(coalesce(p_limit, 50), 1), 200), greatest(coalesce(p_offset, 0), 0), v_strip;

  return v_result;
end;
$$;

create or replace function public.admin_set_status(p_entity text, p_id uuid, p_status public.content_status)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform public.assert_staff();
  if p_entity not in ('tools', 'categories', 'use_cases', 'articles', 'comparisons', 'collections', 'prompts', 'glossary_terms', 'learning_paths', 'language_tests') then
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
  if p_entity not in ('tools', 'categories', 'use_cases', 'articles', 'comparisons', 'collections', 'submissions', 'contact_messages', 'prompts', 'glossary_terms', 'learning_paths') then
    raise exception 'Непознат тип на содржина: %', p_entity using errcode = '22023';
  end if;
  execute format('delete from public.%I where id = $1', p_entity) using p_id;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Записот не е пронајден.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_verify_tool(p_id uuid, p_note text default null, p_next_review date default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_previous timestamptz;
begin
  perform public.assert_staff();
  select last_verified_at into v_previous from public.tools where id = p_id;
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
  -- Alerts go out only for verified changes, never for unreviewed edits.
  perform public.notify_price_watchers(p_id, v_previous);
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
    insert into public.collections (title, slug, description, intro, methodology, status, is_featured, seo_title, seo_description, kind, audience_label)
    values (trim(r.title), r.slug, coalesce(r.description, ''), coalesce(r.intro, ''), coalesce(r.methodology, ''),
      coalesce(r.status, 'draft'), coalesce(r.is_featured, false), nullif(r.seo_title, ''), nullif(r.seo_description, ''),
      coalesce(r.kind, 'topic'), nullif(trim(coalesce(r.audience_label, '')), ''))
    returning id into v_id;
  else
    update public.collections set
      title = trim(r.title), slug = r.slug, description = coalesce(r.description, ''), intro = coalesce(r.intro, ''),
      methodology = coalesce(r.methodology, ''), status = coalesce(r.status, status),
      is_featured = coalesce(r.is_featured, false), seo_title = nullif(r.seo_title, ''), seo_description = nullif(r.seo_description, ''),
      kind = coalesce(r.kind, kind), audience_label = nullif(trim(coalesce(r.audience_label, '')), '')
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
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function
  public.has_free_access(public.tools), public.free_alternatives_count(uuid, boolean),
  public.prompt_card(public.prompts), public.language_test_json(public.language_tests),
  public.learning_path_card(public.learning_paths), public.collection_card(public.collections),
  public.api_prompts(text, text, text, integer, integer), public.api_prompt(text, boolean),
  public.api_glossary(), public.api_glossary_term(text, boolean), public.api_language_tests(),
  public.api_alternatives(text), public.api_alternatives_index(), public.api_compare_tools(text[]),
  public.api_learning_paths(), public.api_learning_path(text, boolean),
  public.api_tool(text, boolean), public.api_home(), public.api_sitemap(),
  public.watch_tool(text, text, boolean, text), public.confirm_watch(uuid, text), public.unwatch_tool(uuid, text)
to anon, authenticated;

grant execute on function
  public.admin_list(text, text, text, integer, integer), public.admin_set_status(text, uuid, public.content_status),
  public.admin_delete(text, uuid), public.admin_verify_tool(uuid, text, date), public.admin_save_collection(jsonb),
  public.notify_price_watchers(uuid, timestamptz), public.admin_options(),
  public.admin_get_prompt(uuid), public.admin_save_prompt(jsonb),
  public.admin_get_glossary_term(uuid), public.admin_save_glossary_term(jsonb),
  public.admin_get_learning_path(uuid), public.admin_save_learning_path(jsonb),
  public.admin_language_tests(uuid), public.admin_save_language_test(jsonb), public.admin_delete_language_test(uuid),
  public.admin_weekly_digest(integer), public.admin_notification_stats()
to authenticated;

-- The e-mail sender runs with the service role only.
revoke execute on function public.claim_notifications(integer), public.complete_notification(uuid, boolean, text) from anon, authenticated;
grant execute on function public.claim_notifications(integer), public.complete_notification(uuid, boolean, text) to service_role;
