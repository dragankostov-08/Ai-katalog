import { Link, useLoaderData } from 'react-router'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchAlternativesIndex } from '../lib/api'
import { plural } from '../lib/labels'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { AlternativesIndexItem } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchAlternativesIndex(request.signal)

export const handle: RouteHandle<AlternativesIndexItem[]> = {
  meta: ({ data }) => ({
    title: 'Бесплатни алтернативи на AI алатки',
    description: 'За секоја AI алатка: слични алатки што можеш да ги користиш бесплатно, со проверени услови.',
    path: '/alternativi',
    noindex: !data?.some((item) => item.verified_alternatives > 0),
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Бесплатни алтернативи', path: '/alternativi' }])],
  }),
}

export function Component() {
  const items = useLoaderData() as AlternativesIndexItem[]
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Бесплатни алтернативи' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Заштеди</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Бесплатни алтернативи</h1>
        <p className="mt-4 text-lg text-graphite">Избери алатка и види кои слични алатки можеш да ги користиш бесплатно.</p>
      </header>
      {items.length ? (
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="group relative flex items-center gap-3 border-b border-ink/15 py-3">
              <ToolLogo name={item.name} src={item.logo_url} size="sm" />
              <div className="min-w-0">
                <Link to={`/alternativi/${item.slug}`} className="font-display font-bold after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:underline-offset-4">
                  Наместо {item.name}
                </Link>
                <p className="font-mono text-xs text-graphite">
                  {item.verified_alternatives
                    ? `${item.verified_alternatives} ${plural(item.verified_alternatives, 'проверена алтернатива', 'проверени алтернативи')}`
                    : `${item.all_alternatives} непроверени`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Наскоро">Листите се појавуваат кога каталогот има доволно алатки со бесплатен план.</EmptyState>
      )}
    </div>
  )
}
