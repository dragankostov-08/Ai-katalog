import { Newspaper } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLoaderData, useRevalidator } from 'react-router'
import { NewsRow } from '../components/editorial/NewsList'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/States'
import { fetchNews } from '../lib/api'
import { formatDate } from '../lib/format'
import { searchParamsOf } from '../lib/loaders'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { NewsData, NewsItem } from '../lib/types'

const PAGE_SIZE = 30

interface NewsPageData extends NewsData {
  page: number
  source: string
}

export async function loader({ request }: { request: Request }): Promise<NewsPageData> {
  const search = searchParamsOf(request)
  const source = /^[0-9a-f-]{36}$/.test(search.get('izvor') ?? '') ? (search.get('izvor') as string) : ''
  const page = Math.max(1, Math.min(100, Number.parseInt(search.get('strana') ?? '1', 10) || 1))
  const data = await fetchNews({ source, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }, request.signal)
  return { ...data, page, source }
}

export const handle: RouteHandle<NewsPageData> = {
  meta: ({ data }) => ({
    title: 'AI вести на македонски',
    description: 'Најновите вести за вештачка интелигенција од македонски технолошки портали, на едно место — со линк до оригиналниот текст.',
    path: '/vesti',
    noindex: !data?.items.length || Boolean(data?.source) || (data?.page ?? 1) > 1,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'AI вести', path: '/vesti' }])],
  }),
}

function groupByDay(items: NewsItem[]) {
  const groups = new Map<string, NewsItem[]>()
  for (const item of items) {
    const key = item.published_at ? formatDate(item.published_at) : 'Без датум'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()]
}

// The pre-rendered HTML holds the headlines from build time; news changes hourly, so
// the first page view that hydrated from that snapshot fetches the current list once.
let refreshedStaticSnapshot = false

export function Component() {
  const { items, sources, total, page, source } = useLoaderData() as NewsPageData
  const revalidator = useRevalidator()
  useEffect(() => {
    if (refreshedStaticSnapshot) return
    refreshedStaticSnapshot = true
    const rendered = (window as Window & { __AIK_RENDERED_URL?: string }).__AIK_RENDERED_URL
    if (rendered === window.location.pathname + window.location.search) void revalidator.revalidate()
  }, [revalidator])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (p: number, izvor = source) => {
    const search = new URLSearchParams()
    if (izvor) search.set('izvor', izvor)
    if (p > 1) search.set('strana', String(p))
    const value = search.toString()
    return value ? `/vesti?${value}` : '/vesti'
  }

  return (
    <div className="container-page pt-6 md:pt-10">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'AI вести' }]} />
      <header className="mb-6 max-w-3xl">
        <h1 className="inline-flex items-center gap-3 text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-tomato-ink">
            <Newspaper className="h-5 w-5" aria-hidden />
          </span>
          AI вести
        </h1>
        <p className="mt-3 text-graphite">
          Најновите вести за вештачка интелигенција од македонски технолошки портали. Прикажуваме наслов, краток опис и линк — целиот текст читај
          го на страницата на изворот.
        </p>
      </header>

      {sources.length > 1 ? (
        <nav aria-label="Извори" className="mb-6 flex flex-wrap gap-2">
          <Link to={href(1, '')} className={`rounded-full px-3 py-1.5 text-sm font-medium ${!source ? 'bg-ink text-paper' : 'bg-surface text-graphite ring-1 ring-light hover:text-ink'}`}>
            Сите извори
          </Link>
          {sources.map((s) => (
            <Link key={s.id} to={href(1, s.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${source === s.id ? 'bg-ink text-paper' : 'bg-surface text-graphite ring-1 ring-light hover:text-ink'}`}>
              {s.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {items.length ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-6">
            {groupByDay(items).map(([day, dayItems]) => (
              <section key={day} aria-label={day} className="rounded-2xl border border-light bg-surface p-2 shadow-sm">
                <h2 className="px-3 pt-2 pb-1 text-sm font-bold text-graphite">{day}</h2>
                <ul className="divide-y divide-light/70">
                  {dayItems.map((item) => (
                    <NewsRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}
            <Pagination page={page} totalPages={totalPages} hrefForPage={(p) => href(p)} />
          </div>
          <aside className="self-start rounded-2xl border border-light bg-surface p-4 text-sm text-graphite shadow-sm">
            <p className="font-semibold text-ink">Извори</p>
            <ul className="mt-2 space-y-1">
              {sources.map((s) => (
                <li key={s.id}>
                  <a href={s.site_url} target="_blank" rel="noopener" className="underline decoration-light underline-offset-2 hover:text-ink">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs">Насловите се преземаат автоматски од јавните RSS фидови на изворите. Авторските права им припаѓаат на изворите.</p>
          </aside>
        </div>
      ) : (
        <EmptyState title="Сè уште нема вести">Вестите се преземаат автоматски од изворите неколку пати дневно.</EmptyState>
      )}
    </div>
  )
}
