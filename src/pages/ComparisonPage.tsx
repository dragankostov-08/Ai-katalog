import { useEffect, type ReactNode } from 'react'
import { Link, useLoaderData } from 'react-router'
import { PricingBadge, VerificationBadge } from '../components/catalog/Badges'
import { OfficialLink } from '../components/catalog/OfficialLink'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { AdSlot } from '../components/editorial/AdSlot'
import { PreviewBanner, PriceChangeNotice } from '../components/editorial/Notices'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SponsoredTag } from '../components/ui/Labels'
import { trackEvent } from '../lib/analytics'
import { fetchComparison } from '../lib/api'
import { formatDate, formatPrice } from '../lib/format'
import { platformLabels, pricingLabels } from '../lib/labels'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown, renderInline, toPlainText } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { ComparisonDetailData, ComparisonTool } from '../lib/types'

type ComparisonPageData = ComparisonDetailData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<ComparisonPageData> {
  const preview = isPreview(request)
  const detail = await fetchComparison(params.slug ?? '', preview, request.signal)
  if (!detail || (detail.tools.length < 2 && !preview)) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<ComparisonPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { comparison } = data
    return {
      title: comparison.seo_title || comparison.title,
      description: comparison.seo_description || toPlainText(comparison.introduction, 160),
      path: `/sporedbi/${comparison.slug}`,
      type: 'article',
      noindex: data.preview,
      publishedTime: comparison.published_at,
      modifiedTime: comparison.updated_at,
      jsonLd: [
        breadcrumbJsonLd([
          { name: 'Почетна', path: '/' },
          { name: 'Споредби', path: '/sporedbi' },
          { name: comparison.title, path: `/sporedbi/${comparison.slug}` },
        ]),
      ],
    }
  },
}

const MISSING = 'Нема проверен податок'

interface Row {
  label: string
  render: (tool: ComparisonTool) => ReactNode | null
}

function verifiedOnly(tool: ComparisonTool, value: ReactNode | null): ReactNode | null {
  return tool.verification_status === 'verified' ? value : null
}

export function Component() {
  const { comparison, tools, preview } = useLoaderData() as ComparisonPageData

  useEffect(() => {
    if (!preview) trackEvent('comparison_view', comparison.slug)
  }, [comparison.slug, preview])

  const rows: Row[] = [
    {
      label: 'Модел на плаќање',
      render: (tool) => verifiedOnly(tool, tool.pricing_type !== 'unknown' ? pricingLabels[tool.pricing_type] : null),
    },
    { label: 'Почетна цена', render: (tool) => verifiedOnly(tool, formatPrice(tool.starting_price, tool.currency, tool.price_period)) },
    {
      label: 'Бесплатен план',
      render: (tool) => verifiedOnly(tool, tool.has_free_plan === true ? 'Да' : tool.has_free_plan === false ? 'Не' : null),
    },
    { label: 'Ограничувања на бесплатниот план', render: (tool) => verifiedOnly(tool, tool.free_plan_limits) },
    { label: 'Платформи', render: (tool) => (tool.platforms.length ? tool.platforms.map((p) => platformLabels[p]).join(', ') : null) },
    {
      label: 'Главни функции',
      render: (tool) =>
        tool.features.length ? (
          <ul className="list-disc space-y-1 pl-4">
            {tool.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null,
    },
    ...comparison.criteria.map<Row>((criterion) => ({
      label: criterion.label,
      render: (tool) => {
        const value = criterion.values[tool.id]
        return value ? renderInline(value) : null
      },
    })),
    { label: 'Предности', render: (tool) => (tool.strengths ? renderInline(tool.strengths) : null) },
    { label: 'Ограничувања', render: (tool) => (tool.limitations ? renderInline(tool.limitations) : null) },
    { label: 'Препорачано за', render: (tool) => (tool.best_for ? renderInline(tool.best_for) : null) },
  ]

  const cell = (value: ReactNode | null) => value ?? <span className="text-sm text-graphite italic">{MISSING}</span>

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Споредби', path: '/sporedbi' }, { name: comparison.title }]} />

      <header className="max-w-4xl">
        <p className="label-mono text-tomato-ink">Споредба · ажурирано {formatDate(comparison.updated_at)}</p>
        <h1 className="mt-3 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">{comparison.title}</h1>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <Markdown source={comparison.introduction} />
        <PriceChangeNotice className="self-start border-l-2 border-ink/20 pl-4" />
      </div>

      {/* Tool header strip */}
      <ul className={`mt-12 grid gap-4 sm:grid-cols-2 ${tools.length === 3 ? 'lg:grid-cols-3' : tools.length >= 4 ? 'lg:grid-cols-4' : ''}`}>
        {tools.map((tool) => (
          <li key={tool.id} className="flex flex-col border border-ink bg-white p-4">
            <div className="flex items-center gap-3">
              <ToolLogo name={tool.name} src={tool.logo_url} />
              <div className="min-w-0">
                <h2 className="font-display text-xl leading-tight font-extrabold">
                  <Link to={`/alatka/${tool.slug}`} className="hover:underline hover:decoration-tomato hover:underline-offset-4">
                    {tool.name}
                  </Link>
                </h2>
                <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
              </div>
            </div>
            <p className="mt-3 text-sm text-graphite">{tool.short_description}</p>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              <PricingBadge tool={tool} />
              {tool.is_sponsored ? <SponsoredTag /> : null}
            </div>
            {tool.website_url ? (
              <div className="mt-3">
                <OfficialLink url={tool.website_url} slug={tool.slug} context="comparison" variant="text" sponsored={tool.is_sponsored} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Desktop/tablet table */}
      <div className="mt-10 hidden overflow-x-auto md:block" role="region" aria-label="Табела за споредба" tabIndex={0}>
        <table className="w-full min-w-[40rem] border-collapse text-left text-[0.95rem]">
          <caption className="sr-only">Споредба: {comparison.title}</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="w-48 py-3 pr-4 align-bottom label-mono text-graphite">
                Критериум
              </th>
              {tools.map((tool) => (
                <th key={tool.id} scope="col" className="py-3 pr-4 align-bottom font-display text-lg font-extrabold">
                  {tool.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-ink/15 align-top even:bg-white/60">
                <th scope="row" className="py-3 pr-4 font-mono text-xs font-medium tracking-wide text-graphite uppercase">
                  {row.label}
                </th>
                {tools.map((tool) => (
                  <td key={tool.id} className="py-3 pr-4">
                    {cell(row.render(tool))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one block per criterion */}
      <div className="mt-10 space-y-6 md:hidden">
        {rows.map((row) => (
          <section key={row.label} className="border-t-2 border-ink pt-2">
            <h3 className="label-mono text-graphite">{row.label}</h3>
            <dl className="mt-2 divide-y divide-ink/15">
              {tools.map((tool) => (
                <div key={tool.id} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5 text-[0.95rem]">
                  <dt className="font-display font-bold">{tool.name}</dt>
                  <dd className="min-w-0">{cell(row.render(tool))}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-sm text-graphite">
        Цените и плановите се прикажуваат само за алатки чии податоци уредништвото ги провери. „{MISSING}“ значи дека податокот не е потврден — не
        дека алатката ја нема таа можност.
      </p>

      <AdSlot placement="comparison" className="mt-12" />

      {comparison.verdict ? (
        <section className="mt-14 max-w-3xl border-t-2 border-ink pt-4" aria-labelledby="comparison-verdict">
          <p className="label-mono text-graphite">Уредничко мислење</p>
          <h2 id="comparison-verdict" className="mt-2 font-display text-3xl font-extrabold">
            Заклучок
          </h2>
          <div className="mt-4">
            <Markdown source={comparison.verdict} />
          </div>
        </section>
      ) : null}
    </article>
  )
}
