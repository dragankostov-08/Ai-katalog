import { Link, useLoaderData } from 'react-router'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { LanguageVerdictBadge } from '../components/editorial/LanguageVerdict'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { fetchLanguageTests } from '../lib/api'
import { formatDate } from '../lib/format'
import { verdictDescriptions, verdictLabels } from '../lib/labels'
import { Markdown } from '../lib/markdown'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { LanguageTest, LanguageTestGroup, LanguageVerdict } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchLanguageTests(request.signal)

export const handle: RouteHandle<LanguageTestGroup[]> = {
  meta: ({ data }) => ({
    title: 'Тестирано на македонски: колку добро AI алатките пишуваат македонски',
    description: 'Иста задача на македонски, повеќе AI алатки: вистински резултати, грешки и оценка од уредништвото, со датум на тестирање.',
    path: '/testirano-na-makedonski',
    noindex: !data?.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Тестирано на македонски', path: '/testirano-na-makedonski' }])],
  }),
}

export function TestResult({ test, toolName }: { test: LanguageTest; toolName?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <LanguageVerdictBadge verdict={test.verdict} />
        <span className="font-mono text-xs text-graphite">
          Тестирано {formatDate(test.tested_at)}
          {test.plan_tested ? ` · ${test.plan_tested}` : ''}
          {test.model_version ? ` · ${test.model_version}` : ''}
        </span>
      </div>
      <figure>
        <blockquote className="max-h-80 overflow-y-auto border-l-4 border-light bg-paper px-4 py-3 font-code text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-charcoal">
          {test.output_excerpt}
        </blockquote>
        <figcaption className="mt-1 text-xs text-graphite">Извадок од одговорот{toolName ? ` на ${toolName}` : ''}, непроменет.</figcaption>
      </figure>
      {test.screenshot_url ? (
        <img src={test.screenshot_url} alt={test.screenshot_alt ?? ''} loading="lazy" className="w-full rounded-xl border border-light" />
      ) : null}
      {test.notes ? <Markdown source={test.notes} className="prose-ak text-[0.95rem]" /> : null}
    </div>
  )
}

export function Component() {
  const groups = useLoaderData() as LanguageTestGroup[]
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Тестирано на македонски' }]} />
      <header className="grid gap-8 border-b border-light pb-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-3xl">
          <p className="label-mono text-tomato-ink">Наши тестови</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.1] font-semibold tracking-tight md:text-6xl">Тестирано на македонски</h1>
          <p className="mt-4 text-lg text-graphite">
            Ја даваме истата задача на македонски на повеќе алатки и го објавуваме вистинскиот одговор, без поправки. Оценката е мислење на
            уредништвото и важи за датумот на тестирање — моделите често се менуваат.
          </p>
        </div>
        <aside className="self-start border border-light bg-surface p-5 rounded-2xl">
          <p className="label-mono mb-3 text-graphite">Скала на оценување</p>
          <dl className="space-y-3 text-sm">
            {(Object.keys(verdictLabels) as LanguageVerdict[]).map((verdict) => (
              <div key={verdict}>
                <dt>
                  <LanguageVerdictBadge verdict={verdict} />
                </dt>
                <dd className="mt-1 text-graphite">{verdictDescriptions[verdict]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </header>

      {groups.length ? (
        <div className="mt-12 space-y-16">
          {groups.map((group) => (
            <section key={group.task_title} aria-label={group.task_title}>
              <h2 className="font-display text-3xl font-semibold">{group.task_title}</h2>
              <details className="mt-3 max-w-3xl">
                <summary className="cursor-pointer text-sm font-medium">Промпт што го користевме</summary>
                <pre className="mt-2 border border-light bg-surface px-4 py-3 font-code text-xs whitespace-pre-wrap rounded-2xl">{group.prompt_used}</pre>
              </details>
              <ol className="mt-6 grid gap-6 lg:grid-cols-2">
                {group.results.map((result) => (
                  <li key={result.id} className="border border-light bg-surface p-5 rounded-2xl">
                    <div className="mb-4 flex items-center gap-3">
                      <ToolLogo name={result.tool.name} src={result.tool.logo_url} size="sm" />
                      <h3 className="font-display text-xl font-bold">
                        <Link to={`/alatka/${result.tool.slug}`} className="hover:underline hover:decoration-tomato hover:underline-offset-4">
                          {result.tool.name}
                        </Link>
                      </h3>
                    </div>
                    <TestResult test={result} toolName={result.tool.name} />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState title="Првите тестови наскоро">Тестовите се објавуваат дури откако уредништвото ќе ги изврши со вистински задачи.</EmptyState>
        </div>
      )}
    </div>
  )
}
