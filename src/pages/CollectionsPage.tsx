import { useLoaderData } from 'react-router'
import { CollectionCard } from '../components/editorial/CollectionCard'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchCollections } from '../lib/api'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { CollectionCard as CollectionCardData } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchCollections(request.signal)

export const handle: RouteHandle<CollectionCardData[]> = {
  meta: ({ data }) => ({
    title: 'Најдобри AI алатки по намена',
    description: 'Уреднички листи на AI алатки за почетници, студенти, мали бизниси и креатори — со објаснета методологија на изборот.',
    path: '/najdobri',
    noindex: !data?.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Најдобри', path: '/najdobri' }])],
  }),
}

export function Component() {
  const collections = useLoaderData() as CollectionCardData[]
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Најдобри' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Уреднички листи</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Најдобри според намена</h1>
        <p className="mt-4 text-lg text-graphite">
          Секоја листа има објаснета методологија. Ако некоја позиција е платена, јасно е означена како спонзорирана — плаќањето не одлучува кој е
          во листата.
        </p>
      </header>
      {collections.length ? (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <li key={collection.id}>
              <CollectionCard collection={collection} index={index} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Листите се подготвуваат" action={<ButtonLink to="/pronajdi">Пробај го прашалникот</ButtonLink>}>
          Првите уреднички листи ќе се појават откако ќе ги провериме сите алатки во нив.
        </EmptyState>
      )}
    </div>
  )
}
