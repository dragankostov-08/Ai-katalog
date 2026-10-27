import { useLoaderData } from 'react-router'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Pagination } from '../components/ui/Pagination'
import { EmptyState } from '../components/ui/States'
import { fetchArticles } from '../lib/api'
import { searchParamsOf } from '../lib/loaders'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { ArticleCard as ArticleCardData } from '../lib/types'

const PAGE_SIZE = 12

interface ArticlesData {
  page: number
  total: number
  items: ArticleCardData[]
}

export async function loader({ request }: { request: Request }): Promise<ArticlesData> {
  const page = Math.max(1, Math.min(200, Number.parseInt(searchParamsOf(request).get('strana') ?? '1', 10) || 1))
  const result = await fetchArticles(PAGE_SIZE, (page - 1) * PAGE_SIZE, request.signal)
  return { page, ...result }
}

export const handle: RouteHandle<ArticlesData> = {
  meta: ({ data }) => ({
    title: data && data.page > 1 ? `Водичи за AI алатки — страница ${data.page}` : 'Водичи за AI алатки',
    description: 'Практични водичи на македонски: како да избереш AI алатка, како да пишуваш промптови и како безбедно да ги користиш.',
    path: data && data.page > 1 ? `/vodici?strana=${data.page}` : '/vodici',
    noindex: !data?.items.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Водичи', path: '/vodici' }])],
  }),
}

export function Component() {
  const { page, total, items } = useLoaderData() as ArticlesData
  const [lead, ...rest] = items
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Водичи' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Научи</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Водичи</h1>
        <p className="mt-4 text-lg text-graphite">Како да ги користиш AI алатките паметно, безбедно и со проверени информации.</p>
      </header>
      {lead ? (
        <>
          {page === 1 ? (
            <div className="border-t-2 border-ink pt-8">
              <ArticleCard article={lead} variant="lead" />
            </div>
          ) : null}
          <ul className="mt-14 grid gap-x-8 gap-y-12 border-t border-ink/20 pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {(page === 1 ? rest : items).map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} hrefForPage={(p) => (p > 1 ? `/vodici?strana=${p}` : '/vodici')} />
        </>
      ) : (
        <EmptyState title="Првите водичи наскоро" action={<ButtonLink to="/alatki">Разгледај ги алатките</ButtonLink>}>
          Пишуваме водичи на македонски и ги проверуваме пред објавување.
        </EmptyState>
      )}
    </div>
  )
}
