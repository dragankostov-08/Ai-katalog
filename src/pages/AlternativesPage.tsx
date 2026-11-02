import { useLoaderData } from 'react-router'
import { PricingBadge, VerificationBadge } from '../components/catalog/Badges'
import { ToolCard } from '../components/catalog/ToolCard'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { PriceChangeNotice } from '../components/editorial/Notices'
import { ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchAlternatives } from '../lib/api'
import { pricingLabels } from '../lib/labels'
import { notFound } from '../lib/loaders'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { AlternativesData } from '../lib/types'

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<AlternativesData> {
  const data = await fetchAlternatives(params.slug ?? '', request.signal)
  if (!data) notFound()
  return data
}

const verifiedOf = (data: AlternativesData) => data.alternatives.filter((a) => a.verification_status === 'verified')

export const handle: RouteHandle<AlternativesData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const verified = verifiedOf(data)
    const path = `/alternativi/${data.tool.slug}`
    return {
      title: `Бесплатни алтернативи на ${data.tool.name}`,
      description: verified.length
        ? `${verified.length} проверени алатки со бесплатен пристап наместо ${data.tool.name}: ${verified.slice(0, 4).map((t) => t.name).join(', ')}.`
        : `Алатки со бесплатен план слични на ${data.tool.name}.`,
      path,
      // Pages without verified free alternatives are not useful search results.
      noindex: verified.length === 0,
      jsonLd: [
        breadcrumbJsonLd([
          { name: 'Почетна', path: '/' },
          { name: 'Бесплатни алтернативи', path: '/alternativi' },
          { name: data.tool.name, path },
        ]),
      ],
    }
  },
}

export function Component() {
  const data = useLoaderData() as AlternativesData
  const { tool } = data
  const verified = verifiedOf(data)
  const unverified = data.alternatives.filter((a) => a.verification_status !== 'verified')

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Бесплатни алтернативи', path: '/alternativi' }, { name: tool.name }]} />
      <header className="grid gap-6 border-b border-light pb-8 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="max-w-3xl">
          <p className="label-mono text-tomato-ink">Алтернативи</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">Бесплатни алтернативи на {tool.name}</h1>
          <p className="mt-4 text-lg text-graphite">
            Алатки од истата категорија или за истата намена што може да се користат бесплатно — целосно, со бесплатен план или како отворен код.
          </p>
        </div>
        <div className="self-start border border-light bg-white p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <ToolLogo name={tool.name} src={tool.logo_url} />
            <div>
              <p className="font-display text-lg font-bold">{tool.name}</p>
              <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
            </div>
          </div>
          <div className="mt-3">
            <PricingBadge tool={tool} />
          </div>
          <ButtonLink to={`/alatka/${tool.slug}`} variant="secondary" size="sm" className="mt-3 w-full">
            Профил на {tool.name}
          </ButtonLink>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="alt-verified">
        <h2 id="alt-verified" className="mb-2 font-display text-2xl font-extrabold">
          Проверени бесплатни алтернативи
        </h2>
        <p className="mb-6 text-sm text-graphite">Бесплатниот пристап е потврден на официјалната страница од уредништвото.</p>
        {verified.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {verified.map((alt) => (
              <li key={alt.id} className="flex flex-col">
                <ToolCard tool={alt} />
                <p className="mt-2 text-sm text-graphite">
                  <span className="font-medium text-ink">{pricingLabels[alt.pricing_type]}.</span>
                  {alt.free_plan_limits ? ` Бесплатен план: ${alt.free_plan_limits}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Сè уште нема проверени бесплатни алтернативи">Уредниците сè уште ги проверуваат условите на сличните алатки.</EmptyState>
        )}
      </section>

      {unverified.length ? (
        <section className="mt-14" aria-labelledby="alt-unverified">
          <h2 id="alt-unverified" className="mb-2 font-display text-2xl font-extrabold">
            Можеби бесплатни — непроверено
          </h2>
          <p className="mb-6 text-sm text-graphite">Според внесените податоци имаат бесплатен пристап, но уредништвото сè уште не ги провери условите.</p>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {unverified.map((alt) => (
              <li key={alt.id}>
                <ToolCard tool={alt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PriceChangeNotice className="mt-10 max-w-2xl" />
    </div>
  )
}
