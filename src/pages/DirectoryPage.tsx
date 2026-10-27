import { useEffect } from 'react'
import { useLoaderData, useRouteLoaderData } from 'react-router'
import { ToolBrowser } from '../components/catalog/ToolBrowser'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { trackEvent } from '../lib/analytics'
import { searchTools } from '../lib/api'
import { hasIndexableParams, parseDirectoryParams, toApiParams, type DirectoryFilters } from '../lib/directory'
import { searchParamsOf } from '../lib/loaders'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { SearchResult, SiteData } from '../lib/types'

interface DirectoryData {
  filters: DirectoryFilters
  result: SearchResult
}

export async function loader({ request }: { request: Request }): Promise<DirectoryData> {
  const filters = parseDirectoryParams(searchParamsOf(request))
  const result = await searchTools(toApiParams(filters), request.signal)
  return { filters, result }
}

export const handle: RouteHandle<DirectoryData> = {
  meta: ({ data }) => {
    const page = data?.filters.strana ?? 1
    const indexable = data ? hasIndexableParams(data.filters) : true
    return {
      title: page > 1 ? `Сите AI алатки — страница ${page}` : 'Сите AI алатки',
      description:
        'Пребарај и филтрирај AI алатки по категорија, намена, цена и платформа. Проверени описи, бесплатни планови и ограничувања на македонски.',
      path: page > 1 && indexable ? `/alatki?strana=${page}` : '/alatki',
      noindex: !indexable,
      jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Алатки', path: '/alatki' }])],
    }
  },
}

export function Component() {
  const { filters, result } = useLoaderData() as DirectoryData
  const site = useRouteLoaderData('root') as SiteData

  useEffect(() => {
    if (filters.q) trackEvent('search', result.total ? 'results' : 'no_results')
  }, [filters.q, result.total])

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Алатки' }]} />
      <header className="mb-8 max-w-3xl">
        <p className="label-mono text-tomato-ink">Каталог</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Сите AI алатки</h1>
        <p className="mt-4 text-lg text-graphite">
          Пребарувај по име или задача и филтрирај по категорија, цена и платформа. Цените ги прикажуваме само кога се проверени.
        </p>
      </header>
      <ToolBrowser filters={filters} result={result} categories={site.categories} useCases={site.use_cases} />
    </div>
  )
}
