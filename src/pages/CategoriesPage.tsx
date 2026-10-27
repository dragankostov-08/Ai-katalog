import { useRouteLoaderData } from 'react-router'
import { CategoryIndex } from '../components/catalog/CategoryIndex'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { SiteData } from '../lib/types'

export const handle: RouteHandle = {
  meta: () => ({
    title: 'Категории на AI алатки',
    description: 'AI алатки поделени по намена: текст, слики, видео, аудио, програмирање, учење, маркетинг, продуктивност и повеќе.',
    path: '/kategorii',
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Категории', path: '/kategorii' }])],
  }),
}

export function Component() {
  const site = useRouteLoaderData('root') as SiteData
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Категории' }]} />
      <header className="mb-10 max-w-3xl">
        <p className="label-mono text-tomato-ink">Индекс</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Категории</h1>
        <p className="mt-4 text-lg text-graphite">Секоја алатка има една главна категорија, а може да се појави и во други каде што е корисна.</p>
      </header>
      <CategoryIndex categories={site.categories} />
    </div>
  )
}
