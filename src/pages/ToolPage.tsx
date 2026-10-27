import { Check, Minus, Plus } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useLoaderData } from 'react-router'
import { VerificationBadge } from '../components/catalog/Badges'
import { FavoriteButton } from '../components/catalog/FavoriteButton'
import { OfficialLink } from '../components/catalog/OfficialLink'
import { CategoryMarker } from '../components/catalog/ToolCard'
import { ToolGrid } from '../components/catalog/ToolGrid'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { AdSlot } from '../components/editorial/AdSlot'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { PreviewBanner, PriceChangeNotice, SponsoredNotice } from '../components/editorial/Notices'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SponsoredTag } from '../components/ui/Labels'
import { SectionHeader } from '../components/ui/SectionHeader'
import { trackEvent } from '../lib/analytics'
import { fetchTool } from '../lib/api'
import { formatDate, formatPrice } from '../lib/format'
import {
  capabilityLabels,
  languageSupportLabels,
  platformLabels,
  pricingDescriptions,
  pricingLabels,
  skillDescriptions,
  skillLabels,
} from '../lib/labels'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown, renderInline } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { ToolDetailData } from '../lib/types'

type ToolPageData = ToolDetailData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<ToolPageData> {
  const preview = isPreview(request)
  const detail = await fetchTool(params.slug ?? '', preview, request.signal)
  if (!detail) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<ToolPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { tool, categories } = data
    const primary = categories.find((c) => c.is_primary) ?? categories[0]
    const crumbs = [
      { name: 'Почетна', path: '/' },
      { name: 'Алатки', path: '/alatki' },
      ...(primary ? [{ name: primary.name, path: `/kategorii/${primary.slug}` }] : []),
      { name: tool.name, path: `/alatka/${tool.slug}` },
    ]
    return {
      title: tool.seo_title || `${tool.name}: што е, цена и алтернативи`,
      description: tool.seo_description || tool.short_description,
      path: `/alatka/${tool.slug}`,
      noindex: data.preview,
      modifiedTime: tool.updated_at,
      jsonLd: [breadcrumbJsonLd(crumbs)],
    }
  },
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-ink/15 py-2.5 text-sm last:border-b-0">
      <dt className="label-mono pt-0.5 text-graphite">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function Unknown({ children = 'Не е проверено' }: { children?: ReactNode }) {
  return <span className="text-graphite italic">{children}</span>
}

export function Component() {
  const data = useLoaderData() as ToolPageData
  const { tool, categories, use_cases, features, related_tools, articles, comparisons, collections, preview } = data
  const primary = categories.find((c) => c.is_primary) ?? categories[0]
  const verified = tool.verification_status === 'verified'
  const price = formatPrice(tool.starting_price, tool.currency, tool.price_period)

  useEffect(() => {
    if (!preview) trackEvent('tool_view', tool.slug)
  }, [tool.slug, preview])

  const freePlan =
    tool.has_free_plan === true ? 'Да' : tool.has_free_plan === false ? 'Не' : tool.pricing_type === 'freemium' ? 'Да (фримиум модел)' : null

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs
        items={[
          { name: 'Почетна', path: '/' },
          { name: 'Алатки', path: '/alatki' },
          ...(primary ? [{ name: primary.name, path: `/kategorii/${primary.slug}` }] : []),
          { name: tool.name },
        ]}
      />

      {/* Identity + action panel */}
      <header className="grid gap-8 border-b-2 border-ink pb-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-4 md:gap-5">
            <ToolLogo name={tool.name} src={tool.logo_url} size="lg" />
            <div className="min-w-0">
              {primary ? <CategoryMarker category={primary} /> : null}
              <h1 className="mt-1.5 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] break-words md:text-6xl">{tool.name}</h1>
              {tool.developer ? <p className="mt-2 font-mono text-sm text-graphite">од {tool.developer}</p> : null}
            </div>
          </div>
          <p className="mt-7 max-w-2xl text-xl leading-relaxed text-charcoal md:text-2xl md:leading-snug">{tool.short_description}</p>
          {use_cases.length ? (
            <div className="mt-6">
              <p className="label-mono mb-2 text-graphite">Корисна за</p>
              <ul className="flex flex-wrap gap-2">
                {use_cases.map((useCase) => (
                  <li key={useCase.slug}>
                    <Link
                      to={`/alatki?namena=${useCase.slug}`}
                      className="inline-block rounded-xs border border-ink/30 bg-white px-2.5 py-1 text-sm hover:border-ink hover:bg-cream"
                    >
                      {useCase.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {tool.is_sponsored ? (
            <div className="mt-6">
              <SponsoredTag />
            </div>
          ) : null}
        </div>

        <aside aria-label="Брз преглед" className="self-start border border-ink bg-white p-5 shadow-offset">
          <div className="flex items-center justify-between gap-2 border-b border-ink pb-3">
            <p className="label-mono">Досие</p>
            <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
          </div>
          <dl className="mt-1">
            <Fact label="Плаќање">{tool.pricing_type !== 'unknown' ? pricingLabels[tool.pricing_type] : <Unknown />}</Fact>
            <Fact label="Почетна цена">{price ?? <Unknown>Не е наведена</Unknown>}</Fact>
            <Fact label="Бесплатен план">{freePlan ?? <Unknown />}</Fact>
          </dl>
          {!verified ? (
            <p className="mt-3 border-l-2 border-mustard bg-cream/50 px-3 py-2 text-xs text-charcoal">
              Цените и плановите за оваа алатка сè уште не се проверени од уредништвото.
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            {tool.website_url ? (
              <OfficialLink url={tool.website_url} slug={tool.slug} context="tool_page" sponsored={tool.is_sponsored} className="w-full">
                Отвори ја {tool.name}
              </OfficialLink>
            ) : null}
            <FavoriteButton slug={tool.slug} name={tool.name} withLabel className="w-full" />
          </div>
        </aside>
      </header>

      {tool.is_sponsored ? (
        <div className="mt-8 max-w-3xl">
          <SponsoredNotice note={tool.sponsor_note} />
        </div>
      ) : null}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem] lg:gap-14">
        <div className="min-w-0 space-y-14">
          {tool.description ? (
            <section aria-labelledby="tool-about">
              <h2 id="tool-about" className="mb-4 border-t border-ink pt-3 font-display text-2xl font-extrabold md:text-3xl">
                Што прави {tool.name}
              </h2>
              <Markdown source={tool.description} />
            </section>
          ) : null}

          <section aria-labelledby="tool-pricing">
            <h2 id="tool-pricing" className="mb-4 border-t border-ink pt-3 font-display text-2xl font-extrabold md:text-3xl">
              Цени и бесплатен план
            </h2>
            <div className="max-w-2xl border border-ink/30 bg-white">
              <dl className="px-4">
                <Fact label="Модел">
                  {tool.pricing_type !== 'unknown' ? (
                    <>
                      <span className="font-medium">{pricingLabels[tool.pricing_type]}</span>
                      <span className="block text-graphite">{pricingDescriptions[tool.pricing_type]}</span>
                    </>
                  ) : (
                    <Unknown />
                  )}
                </Fact>
                <Fact label="Почетна цена">{price ?? <Unknown>Не е наведена</Unknown>}</Fact>
                <Fact label="Бесплатен план">{freePlan ?? <Unknown />}</Fact>
                {tool.free_plan_limits ? <Fact label="Ограничувања">{tool.free_plan_limits}</Fact> : null}
                {tool.pricing_notes ? <Fact label="Белешки">{renderInline(tool.pricing_notes)}</Fact> : null}
              </dl>
              <p className="border-t border-ink/15 px-4 py-2.5 font-mono text-xs text-graphite">
                {verified && tool.last_verified_at
                  ? `Проверено на официјалната страница: ${formatDate(tool.last_verified_at)}`
                  : 'Статус: непроверено од уредништвото'}
              </p>
            </div>
            <PriceChangeNotice className="mt-4 max-w-2xl" />
          </section>

          {features.length ? (
            <section aria-labelledby="tool-features">
              <h2 id="tool-features" className="mb-4 border-t border-ink pt-3 font-display text-2xl font-extrabold md:text-3xl">
                Главни функции
              </h2>
              <ul className="grid max-w-3xl gap-x-8 sm:grid-cols-2">
                {features.map((feature) => (
                  <li key={feature.id} className="flex gap-3 border-b border-ink/15 py-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-teal-ink" aria-hidden />
                    <span>
                      <span className="font-medium">{feature.feature_name}</span>
                      {feature.feature_value ? <span className="block text-sm text-graphite">{feature.feature_value}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tool.capabilities.length ? (
            <section aria-labelledby="tool-capabilities">
              <h2 id="tool-capabilities" className="mb-4 border-t border-ink pt-3 font-display text-2xl font-extrabold md:text-3xl">
                Потврдени можности
              </h2>
              <ul className="flex flex-wrap gap-2">
                {tool.capabilities.map((capability) => (
                  <li key={capability} className="rounded-xs border border-ink bg-white px-2.5 py-1 text-sm">
                    {capabilityLabels[capability]}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tool.pros.length || tool.cons.length || tool.editorial_verdict ? (
            <section aria-labelledby="tool-assessment">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-3">
                <h2 id="tool-assessment" className="font-display text-2xl font-extrabold md:text-3xl">
                  Уредничка проценка
                </h2>
                <Link to="/metodologija" className="text-sm underline underline-offset-2 hover:text-tomato-ink">
                  Како оценуваме
                </Link>
              </div>
              <p className="mb-5 label-mono text-graphite">Мислење на уредништвото — не е реклама и не е платено.</p>
              {tool.pros.length || tool.cons.length ? (
                <div className="grid max-w-3xl gap-6 md:grid-cols-2">
                  {tool.pros.length ? (
                    <div>
                      <h3 className="mb-2 font-display text-lg font-bold">Предности</h3>
                      <ul className="space-y-2">
                        {tool.pros.map((pro) => (
                          <li key={pro} className="flex gap-2.5">
                            <Plus className="mt-1 h-4 w-4 shrink-0 text-teal-ink" aria-hidden />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {tool.cons.length ? (
                    <div>
                      <h3 className="mb-2 font-display text-lg font-bold">Недостатоци и ограничувања</h3>
                      <ul className="space-y-2">
                        {tool.cons.map((con) => (
                          <li key={con} className="flex gap-2.5">
                            <Minus className="mt-1 h-4 w-4 shrink-0 text-tomato-ink" aria-hidden />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {tool.editorial_verdict ? (
                <div className="mt-8 max-w-3xl border-l-4 border-mustard bg-cream/60 px-5 py-4">
                  <p className="label-mono mb-2 text-graphite">Заклучок</p>
                  <Markdown source={tool.editorial_verdict} className="prose-ak max-w-none font-serif text-lg italic" />
                </div>
              ) : null}
            </section>
          ) : null}

          <AdSlot placement="tool" />
        </div>

        <aside aria-label="Податоци за алатката" className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="mb-1 label-mono text-graphite">Податоци</h2>
          <dl className="border-t border-ink">
            {categories.length ? (
              <Fact label="Категории">
                <ul className="space-y-1">
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <Link to={`/kategorii/${category.slug}`} className="underline decoration-ink/30 underline-offset-2 hover:decoration-tomato">
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Fact>
            ) : null}
            <Fact label="Платформи">
              {tool.platforms.length ? tool.platforms.map((platform) => platformLabels[platform]).join(', ') : <Unknown />}
            </Fact>
            <Fact label="Македонски">
              {tool.macedonian_support === 'unknown' ? <Unknown /> : languageSupportLabels[tool.macedonian_support]}
            </Fact>
            {tool.skill_level ? (
              <Fact label="Ниво">
                {skillLabels[tool.skill_level]}
                <span className="block text-graphite">{skillDescriptions[tool.skill_level]}</span>
              </Fact>
            ) : null}
            {tool.best_for ? <Fact label="За кого е">{tool.best_for}</Fact> : null}
            <Fact label="Проверка">
              <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
            </Fact>
            {tool.next_review_at && verified ? <Fact label="Следна проверка">{formatDate(tool.next_review_at)}</Fact> : null}
            {tool.published_at ? <Fact label="Во каталогот од">{formatDate(tool.published_at)}</Fact> : null}
          </dl>
          <p className="mt-4 text-xs text-graphite">
            Гледаш грешка?{' '}
            <Link to="/kontakt?tema=correction" className="underline underline-offset-2">
              Пријави корекција
            </Link>
          </p>
        </aside>
      </div>

      {related_tools.length ? (
        <section className="mt-20" aria-labelledby="tool-related">
          <SectionHeader id="tool-related" index="Алтернативи" title={`Слични на ${tool.name}`} link={primary ? { to: `/kategorii/${primary.slug}`, label: `Сè во ${primary.name}` } : undefined} />
          <ToolGrid tools={related_tools} columns={4} />
        </section>
      ) : null}

      {comparisons.length ? (
        <section className="mt-16" aria-labelledby="tool-comparisons">
          <SectionHeader id="tool-comparisons" index="Споредби" title={`${tool.name} во споредба`} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {comparisons.map((comparison) => (
              <li key={comparison.id}>
                <ComparisonCard comparison={comparison} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {articles.length ? (
        <section className="mt-16" aria-labelledby="tool-guides">
          <SectionHeader id="tool-guides" index="Водичи" title="Поврзани водичи" />
          <ul className="grid gap-8 md:grid-cols-3">
            {articles.slice(0, 3).map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {collections.length ? (
        <section className="mt-16 border-t border-ink/20 pt-6" aria-labelledby="tool-collections">
          <h2 id="tool-collections" className="label-mono text-graphite">
            Се наоѓа во листите
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link to={`/najdobri/${collection.slug}`} className="font-display text-lg font-bold underline decoration-tomato decoration-2 underline-offset-4">
                  {collection.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
