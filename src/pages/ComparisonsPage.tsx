import { useLoaderData } from 'react-router'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchComparisons } from '../lib/api'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { ComparisonCard as ComparisonCardData } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchComparisons(request.signal)

export const handle: RouteHandle<ComparisonCardData[]> = {
  meta: ({ data }) => ({
    title: 'Споредби на AI алатки',
    description: 'Структурирани споредби на AI алатки: цени, бесплатни планови, функции, предности и ограничувања, една до друга.',
    path: '/sporedbi',
    noindex: !data?.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Споредби', path: '/sporedbi' }])],
  }),
}

export function Component() {
  const comparisons = useLoaderData() as ComparisonCardData[]
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Споредби' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Една до друга</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Споредби</h1>
        <p className="mt-4 text-lg text-graphite">
          Споредуваме само проверени податоци. Кога некој податок не е проверен, тоа јасно го пишуваме наместо да претпоставуваме.
        </p>
      </header>
      {comparisons.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((comparison) => (
            <li key={comparison.id}>
              <ComparisonCard comparison={comparison} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Првите споредби се подготвуваат" action={<ButtonLink to="/alatki">Разгледај ги алатките</ButtonLink>}>
          Секоја споредба ја објавуваме откако ќе ги провериме податоците за сите алатки во неа.
        </EmptyState>
      )}
    </div>
  )
}
