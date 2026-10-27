import { useEffect } from 'react'
import { Link, useLoaderData } from 'react-router'
import { PricingBadge, VerificationBadge } from '../components/catalog/Badges'
import { FavoriteButton } from '../components/catalog/FavoriteButton'
import { OfficialLink } from '../components/catalog/OfficialLink'
import { CategoryMarker } from '../components/catalog/ToolCard'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { PreviewBanner, PriceChangeNotice } from '../components/editorial/Notices'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SponsoredTag } from '../components/ui/Labels'
import { trackEvent } from '../lib/analytics'
import { fetchCollection } from '../lib/api'
import { formatDate } from '../lib/format'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { CollectionDetailData } from '../lib/types'

type CollectionPageData = CollectionDetailData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<CollectionPageData> {
  const preview = isPreview(request)
  const detail = await fetchCollection(params.slug ?? '', preview, request.signal)
  if (!detail || (!detail.entries.length && !preview)) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<CollectionPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { collection } = data
    return {
      title: collection.seo_title || collection.title,
      description: collection.seo_description || collection.description,
      path: `/najdobri/${collection.slug}`,
      type: 'article',
      noindex: data.preview,
      modifiedTime: collection.updated_at,
      jsonLd: [
        breadcrumbJsonLd([
          { name: 'Почетна', path: '/' },
          { name: 'Најдобри', path: '/najdobri' },
          { name: collection.title, path: `/najdobri/${collection.slug}` },
        ]),
      ],
    }
  },
}

export function Component() {
  const { collection, entries, preview } = useLoaderData() as CollectionPageData
  const hasSponsored = entries.some((entry) => entry.is_sponsored)

  useEffect(() => {
    if (!preview) trackEvent('collection_view', collection.slug)
  }, [collection.slug, preview])

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Најдобри', path: '/najdobri' }, { name: collection.title }]} />

      <header className="max-w-4xl">
        <p className="label-mono text-tomato-ink">
          Уреднична листа · {entries.length} алатки · ажурирано {formatDate(collection.updated_at)}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">{collection.title}</h1>
        <p className="mt-5 max-w-2xl font-serif text-xl leading-relaxed text-graphite italic">{collection.description}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>{collection.intro ? <Markdown source={collection.intro} /> : null}</div>
        <aside className="relative self-start border border-ink bg-white p-5" aria-labelledby="methodology-title">
          <span aria-hidden className="absolute -top-3 right-4 rotate-[4deg] border-2 border-tomato px-2 py-0.5 font-mono text-[0.625rem] font-medium tracking-[0.2em] text-tomato-ink uppercase">
            Методологија
          </span>
          <h2 id="methodology-title" className="font-display text-lg font-bold">
            Како ја составивме листата
          </h2>
          <Markdown source={collection.methodology} className="prose-ak mt-2 text-[0.95rem] leading-relaxed" />
          {hasSponsored ? (
            <p className="mt-3 border-t border-ink/15 pt-3 text-sm text-graphite">
              Позициите означени како <SponsoredTag /> се платени. <Link to="/affiliate-izjava" className="underline">Повеќе</Link>
            </p>
          ) : null}
        </aside>
      </div>

      <ol className="mt-14 space-y-6">
        {entries.map((entry, index) => (
          <li key={entry.tool.id} className="grid gap-5 border-t-2 border-ink pt-5 md:grid-cols-[5rem_1fr_16rem] md:gap-8">
            <span className="font-display text-5xl leading-none font-black text-transparent md:text-7xl" style={{ WebkitTextStroke: '1.5px var(--color-ink)' }} aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <ToolLogo name={entry.tool.name} src={entry.tool.logo_url} />
                <div className="min-w-0">
                  <h2 className="font-display text-2xl leading-tight font-extrabold">
                    <span className="sr-only">{index + 1}. </span>
                    <Link to={`/alatka/${entry.tool.slug}`} className="hover:underline hover:decoration-tomato hover:underline-offset-4">
                      {entry.tool.name}
                    </Link>
                  </h2>
                  <CategoryMarker category={entry.tool.category} />
                </div>
                {entry.is_sponsored ? <SponsoredTag className="ml-auto" /> : null}
              </div>
              <p className="mt-3 text-graphite">{entry.tool.short_description}</p>
              <div className="mt-4 border-l-4 border-mustard bg-cream/50 px-4 py-3">
                <p className="label-mono mb-1 text-graphite">Зошто е во листата</p>
                <p>{entry.editorial_reason}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:border-l md:border-ink/15 md:pl-6">
              <PricingBadge tool={entry.tool} />
              {entry.tool.verification_status === 'verified' && entry.tool.free_plan_limits ? (
                <p className="text-sm text-graphite">
                  <span className="font-medium text-ink">Бесплатен план: </span>
                  {entry.tool.free_plan_limits}
                </p>
              ) : null}
              <VerificationBadge status={entry.tool.verification_status} date={entry.tool.last_verified_at} />
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link to={`/alatka/${entry.tool.slug}`} className="text-sm font-medium underline underline-offset-4">
                  Цел профил
                </Link>
                {entry.tool.website_url ? (
                  <OfficialLink
                    url={entry.tool.website_url}
                    slug={entry.tool.slug}
                    context="collection"
                    variant="text"
                    sponsored={entry.is_sponsored || entry.tool.is_sponsored}
                    className="text-sm"
                  >
                    Официјална страница
                  </OfficialLink>
                ) : null}
                <FavoriteButton slug={entry.tool.slug} name={entry.tool.name} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <PriceChangeNotice className="mt-10 max-w-2xl" />
    </article>
  )
}
