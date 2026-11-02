import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Form, useLoaderData, useNavigation, useRouteLoaderData, useSearchParams } from 'react-router'
import { PromptCard } from '../components/editorial/PromptCard'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/States'
import { fetchPrompts } from '../lib/api'
import { plural } from '../lib/labels'
import { searchParamsOf } from '../lib/loaders'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { PromptCard as PromptCardData, SiteData } from '../lib/types'

const PAGE_SIZE = 24

interface PromptsData {
  q: string
  namena: string
  alatka: string
  page: number
  total: number
  items: PromptCardData[]
}

export async function loader({ request }: { request: Request }): Promise<PromptsData> {
  const search = searchParamsOf(request)
  const q = (search.get('q') ?? '').slice(0, 100)
  const namena = (search.get('namena') ?? '').slice(0, 80)
  const alatka = (search.get('alatka') ?? '').slice(0, 80)
  const page = Math.max(1, Math.min(200, Number.parseInt(search.get('strana') ?? '1', 10) || 1))
  const result = await fetchPrompts({ query: q, useCase: namena, tool: alatka, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }, request.signal)
  return { q, namena, alatka, page, ...result }
}

export const handle: RouteHandle<PromptsData> = {
  meta: ({ data }) => ({
    title: data && data.page > 1 ? `Промптови на македонски — страница ${data.page}` : 'Готови промптови на македонски',
    description: 'Библиотека на проверени промптови на македонски за е-пошта, учење, резимеа, објави, презентации и код — копирај и прилагоди.',
    path: data && data.page > 1 && !data.q && !data.namena && !data.alatka ? `/promptovi?strana=${data.page}` : '/promptovi',
    noindex: !data?.items.length || Boolean(data?.q || data?.namena || data?.alatka),
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Промптови', path: '/promptovi' }])],
  }),
}

export function Component() {
  const { q, namena, alatka, page, total, items } = useLoaderData() as PromptsData
  const site = useRouteLoaderData('root') as SiteData
  const [, setSearchParams] = useSearchParams()
  const navigation = useNavigation()
  const [query, setQuery] = useState(q)
  useEffect(() => setQuery(q), [q])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const loading = navigation.state === 'loading' && navigation.location?.pathname === '/promptovi'

  const hrefForPage = (p: number) => {
    const search = new URLSearchParams()
    if (q) search.set('q', q)
    if (namena) search.set('namena', namena)
    if (alatka) search.set('alatka', alatka)
    if (p > 1) search.set('strana', String(p))
    const value = search.toString()
    return value ? `/promptovi?${value}` : '/promptovi'
  }

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Промптови' }]} />
      <header className="mb-8 max-w-3xl">
        <p className="label-mono text-tomato-ink">Библиотека</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">Готови промптови на македонски</h1>
        <p className="mt-4 text-lg text-graphite">
          Копирај, замени ги деловите во [загради] со свои податоци и залепи во AI асистентот. Секој промпт има упатство и предупредувања.
        </p>
      </header>

      <Form method="get" action="/promptovi" role="search" className="mb-6 flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 rounded-full border border-light bg-white p-1 shadow-sm focus-within:border-tomato focus-within:ring-4 focus-within:ring-brand-soft">
          <Search className="ml-3 h-5 w-5 shrink-0 self-center text-graphite" aria-hidden />
          <label htmlFor="prompt-search" className="sr-only">
            Пребарај промптови
          </label>
          <input
            id="prompt-search"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="на пр. е-порака, резиме, испит…"
            className="h-12 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          {namena ? <input type="hidden" name="namena" value={namena} /> : null}
          <button type="submit" className="m-1 bg-tomato px-4 text-sm font-medium text-white">
            Барај
          </button>
        </div>
      </Form>

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Намена">
        <button
          type="button"
          onClick={() => setSearchParams(q ? { q } : {})}
          aria-pressed={!namena}
          className={`rounded-xs border px-2.5 py-1 text-sm ${!namena ? 'border-light bg-tomato text-white' : 'border-light bg-white hover:border-brand-line'}`}
        >
          Сите
        </button>
        {site.use_cases.map((useCase) => (
          <button
            key={useCase.slug}
            type="button"
            onClick={() => setSearchParams({ ...(q ? { q } : {}), namena: useCase.slug })}
            aria-pressed={namena === useCase.slug}
            className={`rounded-xs border px-2.5 py-1 text-sm ${namena === useCase.slug ? 'border-light bg-tomato text-white' : 'border-light bg-white hover:border-brand-line'}`}
          >
            {useCase.name}
          </button>
        ))}
      </div>

      {alatka ? (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          Промптови за алатката <strong>{alatka}</strong>
          <button type="button" onClick={() => setSearchParams(q ? { q } : {})} className="underline">
            Прикажи ги сите
          </button>
        </p>
      ) : null}
      <p className="mb-4 border-b border-light pb-3 font-mono text-sm" aria-live="polite">
        {loading ? 'Се вчитува…' : `${total} ${plural(total, 'промпт', 'промптови')}`}
      </p>

      {items.length ? (
        <ul className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-50' : ''}`} aria-busy={loading}>
          {items.map((prompt) => (
            <li key={prompt.id}>
              <PromptCard prompt={prompt} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={q || namena ? 'Нема промптови за овој избор' : 'Библиотеката се подготвува'} action={<ButtonLink to="/vodici/kako-da-napishesh-dobar-prompt">Научи да пишуваш промптови</ButtonLink>}>
          {q || namena ? 'Пробај друг збор или избери „Сите“.' : 'Уредниците ги проверуваат првите промптови.'}
        </EmptyState>
      )}
      <Pagination page={page} totalPages={totalPages} hrefForPage={hrefForPage} />
    </div>
  )
}
