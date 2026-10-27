import { useEffect } from 'react'
import { useLoaderData, useRouteLoaderData } from 'react-router'
import { CategoryIcon } from '../components/catalog/CategoryIcon'
import { ToolBrowser } from '../components/catalog/ToolBrowser'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { PreviewBanner } from '../components/editorial/Notices'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SectionHeader } from '../components/ui/SectionHeader'
import { EmptyState } from '../components/ui/States'
import { trackEvent } from '../lib/analytics'
import { fetchCategory, searchTools } from '../lib/api'
import { parseDirectoryParams, toApiParams, type DirectoryFilters } from '../lib/directory'
import { accentClasses, plural } from '../lib/labels'
import { isPreview, notFound, searchParamsOf } from '../lib/loaders'
import { Markdown } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { CategoryDetailData, SearchResult, SiteData } from '../lib/types'

interface CategoryPageData {
  detail: CategoryDetailData
  filters: DirectoryFilters
  result: SearchResult
  preview: boolean
}

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<CategoryPageData> {
  const preview = isPreview(request)
  const filters = parseDirectoryParams(searchParamsOf(request))
  const [detail, result] = await Promise.all([
    fetchCategory(params.slug ?? '', preview, request.signal),
    searchTools(toApiParams(filters, params.slug), request.signal),
  ])
  if (!detail) notFound()
  return { detail, filters, result, preview }
}

export const handle: RouteHandle<CategoryPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { category, tool_count } = data.detail
    const filtered = data.filters.q || data.filters.namena || data.filters.cena.length || data.filters.besplatno || data.filters.platforma || data.filters.sort
    return {
      title: category.seo_title || `AI алатки: ${category.name}`,
      description: category.seo_description || category.description,
      path: `/kategorii/${category.slug}${data.filters.strana > 1 && !filtered ? `?strana=${data.filters.strana}` : ''}`,
      // Empty or filtered category views are not useful search results.
      noindex: tool_count === 0 || Boolean(filtered) || data.preview,
      jsonLd: [
        breadcrumbJsonLd([
          { name: 'Почетна', path: '/' },
          { name: 'Категории', path: '/kategorii' },
          { name: category.name, path: `/kategorii/${category.slug}` },
        ]),
      ],
    }
  },
}

export function Component() {
  const { detail, filters, result, preview } = useLoaderData() as CategoryPageData
  const site = useRouteLoaderData('root') as SiteData
  const { category, tool_count, articles, comparisons } = detail
  const position = site.categories.findIndex((c) => c.slug === category.slug)

  useEffect(() => {
    trackEvent('category_view', category.slug)
  }, [category.slug])

  return (
    <div className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Категории', path: '/kategorii' }, { name: category.name }]} />
      <header className="mb-10 grid gap-6 border-b-2 border-ink pb-8 md:grid-cols-[auto_1fr] md:items-end">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-16 w-16 items-center justify-center bg-ink text-paper md:h-20 md:w-20">
            <CategoryIcon name={category.icon} className="h-8 w-8 md:h-10 md:w-10" />
          </span>
          {position >= 0 ? <span className="font-mono text-sm text-graphite md:hidden">№ {String(position + 1).padStart(2, '0')}</span> : null}
        </div>
        <div>
          <p className="flex items-center gap-2 label-mono text-graphite">
            <span aria-hidden className={`h-2 w-2 ${accentClasses[category.accent ?? 'ink']}`} />
            <span className="hidden md:inline">{position >= 0 ? `№ ${String(position + 1).padStart(2, '0')} · ` : ''}</span>
            {tool_count} {plural(tool_count, 'алатка', 'алатки')}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">{category.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-graphite">{category.description}</p>
        </div>
      </header>

      {category.intro ? <Markdown source={category.intro} className="prose-ak mb-12 max-w-3xl" /> : null}

      {tool_count === 0 ? (
        <EmptyState
          title="Оваа категорија се подготвува"
          action={
            <>
              <ButtonLink to="/alatki" variant="secondary">
                Сите алатки
              </ButtonLink>
              <ButtonLink to="/predlozi">Предложи алатка</ButtonLink>
            </>
          }
        >
          Уредниците сè уште ги проверуваат алатките за оваа област. Знаеш добра алатка? Предложи ја.
        </EmptyState>
      ) : (
        <ToolBrowser filters={filters} result={result} categories={site.categories} useCases={site.use_cases} hideCategory />
      )}

      {articles.length ? (
        <section className="mt-20" aria-labelledby="category-guides">
          <SectionHeader id="category-guides" index="Водичи" title={`Водичи за: ${category.name.toLowerCase()}`} link={{ to: '/vodici', label: 'Сите водичи' }} />
          <ul className="grid gap-8 md:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {comparisons.length ? (
        <section className="mt-16" aria-labelledby="category-comparisons">
          <SectionHeader id="category-comparisons" index="Споредби" title="Поврзани споредби" />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((comparison) => (
              <li key={comparison.id}>
                <ComparisonCard comparison={comparison} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
