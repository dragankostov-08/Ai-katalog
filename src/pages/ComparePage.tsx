import { Plus, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLoaderData, useNavigate } from 'react-router'
import { PricingBadge, VerificationBadge } from '../components/catalog/Badges'
import { OfficialLink } from '../components/catalog/OfficialLink'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { verdictLabels } from '../lib/labels'
import { PriceChangeNotice } from '../components/editorial/Notices'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchCompare, searchTools } from '../lib/api'
import { compareHref, MAX_COMPARE, setCompare } from '../lib/compare'
import { formatPrice } from '../lib/format'
import { capabilityLabels, languageSupportLabels, platformLabels, pricingLabels, skillLabels } from '../lib/labels'
import { searchParamsOf } from '../lib/loaders'
import type { RouteHandle } from '../lib/seo'
import type { CompareData, CompareTool, ToolCard } from '../lib/types'

interface ComparePageData extends CompareData {
  slugs: string[]
}

export async function loader({ request }: { request: Request }): Promise<ComparePageData> {
  const slugs = (searchParamsOf(request).get('alatki') ?? '')
    .split(',')
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, MAX_COMPARE)
  if (!slugs.length) return { slugs, tools: [], comparisons: [] }
  return { slugs, ...(await fetchCompare(slugs, request.signal)) }
}

export const handle: RouteHandle<ComparePageData> = {
  meta: ({ data }) => ({
    title: data?.tools.length ? `Спореди: ${data.tools.map((t) => t.name).join(' vs ')}` : 'Спореди AI алатки по избор',
    description: 'Избери две или три AI алатки и спореди ги цените, бесплатните планови, платформите и поддршката за македонски.',
    path: '/sporedi',
    // Arbitrary combinations would create thin, duplicate pages.
    noindex: true,
  }),
}

const MISSING = 'Нема проверен податок'
const verified = (tool: CompareTool, value: ReactNode | null) => (tool.verification_status === 'verified' ? value : null)

function ToolPicker({ exclude, onPick }: { exclude: string[]; onPick: (tool: ToolCard) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ToolCard[]>([])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchTools({ query, sort: query ? undefined : 'name', limit: 8, offset: 0 }, controller.signal)
        .then((result) => setResults(result.items))
        .catch(() => {})
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])
  return (
    <div className="border border-light bg-white p-3 rounded-2xl">
      <div className="flex rounded-full border border-light px-1">
        <Search className="ml-2 h-4 w-4 shrink-0 self-center text-graphite" aria-hidden />
        <label htmlFor="compare-search" className="sr-only">
          Најди алатка за споредба
        </label>
        <input id="compare-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Најди алатка…" className="h-9 min-w-0 flex-1 px-2 text-sm focus:outline-none" />
      </div>
      <ul className="mt-2 max-h-64 overflow-y-auto">
        {results
          .filter((tool) => !exclude.includes(tool.slug))
          .map((tool) => (
            <li key={tool.slug}>
              <button type="button" onClick={() => onPick(tool)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-cream">
                <Plus className="h-3.5 w-3.5" aria-hidden /> {tool.name}
              </button>
            </li>
          ))}
      </ul>
    </div>
  )
}

export function Component() {
  const { tools, comparisons } = useLoaderData() as ComparePageData
  const navigate = useNavigate()
  const slugs = tools.map((t) => t.slug)

  useEffect(() => {
    // Keep the floating compare tray in sync with what is on screen.
    if (tools.length) setCompare(tools.map((t) => ({ slug: t.slug, name: t.name })))
  }, [tools])

  const go = (next: string[]) => navigate(next.length ? compareHref(next) : '/sporedi', { preventScrollReset: true })

  const rows: { label: string; render: (tool: CompareTool) => ReactNode | null }[] = [
    { label: 'Категорија', render: (t) => t.category?.name ?? null },
    { label: 'Модел на плаќање', render: (t) => verified(t, t.pricing_type !== 'unknown' ? pricingLabels[t.pricing_type] : null) },
    { label: 'Почетна цена', render: (t) => verified(t, formatPrice(t.starting_price, t.currency, t.price_period)) },
    { label: 'Бесплатен план', render: (t) => verified(t, t.has_free_plan === true ? 'Да' : t.has_free_plan === false ? 'Не' : null) },
    { label: 'Ограничувања на бесплатниот план', render: (t) => verified(t, t.free_plan_limits) },
    { label: 'Платформи', render: (t) => (t.platforms.length ? t.platforms.map((p) => platformLabels[p]).join(', ') : null) },
    { label: 'Македонски јазик', render: (t) => (t.macedonian_support !== 'unknown' ? languageSupportLabels[t.macedonian_support] : null) },
    {
      label: 'Наш тест на македонски',
      render: (t) => (t.language_verdict ? <Link to="/testirano-na-makedonski" className="underline">{verdictLabels[t.language_verdict]}</Link> : null),
    },
    { label: 'Ниво', render: (t) => (t.skill_level ? skillLabels[t.skill_level] : null) },
    { label: 'Потврдени можности', render: (t) => (t.capabilities.length ? t.capabilities.map((c) => capabilityLabels[c]).join(', ') : null) },
    { label: 'Намени', render: (t) => (t.use_cases.length ? t.use_cases.join(', ') : null) },
    {
      label: 'Главни функции',
      render: (t) =>
        t.features.length ? (
          <ul className="list-disc space-y-1 pl-4">
            {t.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null,
    },
    { label: 'За кого е', render: (t) => t.best_for },
    { label: 'Предности (уредничко мислење)', render: (t) => (t.pros.length ? t.pros.join(' · ') : null) },
    { label: 'Недостатоци (уредничко мислење)', render: (t) => (t.cons.length ? t.cons.join(' · ') : null) },
  ]
  const cell = (value: ReactNode | null) => value ?? <span className="text-sm text-graphite italic">{MISSING}</span>

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Спореди алатки' }]} />
      <header className="mb-8 max-w-3xl">
        <p className="label-mono text-tomato-ink">По твој избор</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">Спореди алатки</h1>
        <p className="mt-4 text-lg text-graphite">
          Избери до {MAX_COMPARE} алатки. Табелата се составува автоматски од податоците во каталогот; цените се прикажуваат само кога се проверени.
        </p>
      </header>

      <div className={`grid gap-4 ${tools.length >= 2 ? 'md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
        {tools.map((tool) => (
          <div key={tool.slug} className="relative flex flex-col border border-light bg-white p-4 rounded-2xl">
            <button type="button" onClick={() => go(slugs.filter((s) => s !== tool.slug))} aria-label={`Отстрани ${tool.name}`} className="absolute top-2 right-2 p-1 hover:text-tomato-ink">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex items-center gap-3 pr-6">
              <ToolLogo name={tool.name} src={tool.logo_url} />
              <div className="min-w-0">
                <h2 className="font-display text-xl leading-tight font-extrabold">
                  <Link to={`/alatka/${tool.slug}`} className="hover:underline">
                    {tool.name}
                  </Link>
                </h2>
                <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
              </div>
            </div>
            <p className="mt-3 text-sm text-graphite">{tool.short_description}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
              <PricingBadge tool={tool} />
              {tool.website_url ? <OfficialLink url={tool.website_url} slug={tool.slug} context="comparison" variant="text" className="text-sm" sponsored={tool.is_sponsored} /> : null}
            </div>
          </div>
        ))}
        {tools.length < MAX_COMPARE ? <ToolPicker exclude={slugs} onPick={(tool) => go([...slugs, tool.slug])} /> : null}
      </div>

      {tools.length >= 2 ? (
        <>
          <div className="mt-10 hidden overflow-x-auto md:block" role="region" aria-label="Табела за споредба" tabIndex={0}>
            <table className="w-full min-w-[40rem] border-collapse text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-light">
                  <th scope="col" className="w-52 py-3 pr-4 label-mono text-graphite">
                    Критериум
                  </th>
                  {tools.map((tool) => (
                    <th key={tool.slug} scope="col" className="py-3 pr-4 font-display text-lg font-extrabold">
                      {tool.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-light align-top even:bg-white/60">
                    <th scope="row" className="py-3 pr-4 font-mono text-xs font-medium tracking-wide text-graphite uppercase">
                      {row.label}
                    </th>
                    {tools.map((tool) => (
                      <td key={tool.slug} className="py-3 pr-4">
                        {cell(row.render(tool))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 space-y-6 md:hidden">
            {rows.map((row) => (
              <section key={row.label} className="border-t border-light pt-2">
                <h3 className="label-mono text-graphite">{row.label}</h3>
                <dl className="mt-2 divide-y divide-light">
                  {tools.map((tool) => (
                    <div key={tool.slug} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5 text-[0.95rem]">
                      <dt className="font-display font-bold">{tool.name}</dt>
                      <dd className="min-w-0">{cell(row.render(tool))}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm text-graphite">„{MISSING}“ значи дека податокот не е потврден — не дека алатката ја нема таа можност.</p>
          <PriceChangeNotice className="mt-4 max-w-2xl" />
        </>
      ) : (
        <div className="mt-10">
          <EmptyState title="Избери најмалку две алатки">Користи го пребарувањето погоре или копчето „Спореди“ на картичките во каталогот.</EmptyState>
        </div>
      )}

      {comparisons.length ? (
        <section className="mt-16" aria-labelledby="compare-editorial">
          <h2 id="compare-editorial" className="mb-4 font-display text-2xl font-extrabold">
            Уреднички споредби за овие алатки
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {comparisons.map((comparison) => (
              <li key={comparison.id}>
                <ComparisonCard comparison={comparison} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
