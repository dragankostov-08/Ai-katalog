import { useState } from 'react'
import { Link } from 'react-router'
import { formatShortDate } from '../../lib/format'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, useAsync } from '../components/ui'

interface Analytics {
  since: string
  outbound_total: number
  outbound_by_tool: { name: string; slug: string; clicks: number }[]
  outbound_by_context: Record<string, number>
  events: Record<string, number>
  top_dimensions: { event: string; dimension: string; total: number }[]
}

const EVENT_LABELS: Record<string, string> = {
  search: 'Пребарувања',
  category_view: 'Отворени категории',
  tool_view: 'Отворени профили',
  comparison_view: 'Отворени споредби',
  article_view: 'Прочитани водичи',
  collection_view: 'Отворени листи',
  recommendation_select: 'Избрани препораки',
  wizard_complete: 'Завршени прашалници',
  newsletter_signup: 'Пријави за билтен',
}

const CONTEXT_LABELS: Record<string, string> = {
  tool_page: 'Профил на алатка',
  card: 'Картичка',
  comparison: 'Споредба',
  collection: 'Листа',
  wizard: 'Прашалник',
  article: 'Водич',
}

export function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const { data, error, loading, reload } = useAsync(() => adminApi.analytics(days) as Promise<unknown> as Promise<Analytics>, [days])

  return (
    <>
      <AdminPageHeader
        title="Аналитика"
        description="Само збирни дневни бројки. Настаните (освен кликовите кон официјални страници) се бројат само кај посетители што дале согласност, па бројките се пониски од реалниот сообраќај."
        actions={
          <select aria-label="Период" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-10 border border-ink/40 bg-white px-2 text-sm">
            <option value={7}>Последни 7 дена</option>
            <option value={30}>Последни 30 дена</option>
            <option value={90}>Последни 90 дена</option>
            <option value={365}>Последна година</option>
          </select>
        }
      />
      {loading && !data ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={`Кликови кон официјални страници од ${formatShortDate(data.since)}`}>
            <p className="font-display text-3xl font-black">{data.outbound_total}</p>
            {data.outbound_by_tool.length ? (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-left">
                    <th className="py-1.5 font-medium">Алатка</th>
                    <th className="py-1.5 text-right font-medium">Кликови</th>
                  </tr>
                </thead>
                <tbody>
                  {data.outbound_by_tool.map((row) => (
                    <tr key={row.slug} className="border-b border-ink/10">
                      <td className="py-1.5">
                        <Link to={`/alatka/${row.slug}`} className="hover:underline">
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-1.5 text-right font-mono">{row.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-graphite">Сè уште нема кликови.</p>
            )}
            {Object.keys(data.outbound_by_context).length ? (
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(data.outbound_by_context).map(([context, clicks]) => (
                  <div key={context} className="flex justify-between border-b border-ink/10 py-1">
                    <dt className="text-graphite">{CONTEXT_LABELS[context] ?? context}</dt>
                    <dd className="font-mono">{clicks}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Panel>
          <Panel title="Настани (со согласност)">
            <dl className="divide-y divide-ink/10 text-sm">
              {Object.keys(EVENT_LABELS).map((event) => (
                <div key={event} className="flex justify-between py-1.5">
                  <dt>{EVENT_LABELS[event]}</dt>
                  <dd className="font-mono">{data.events[event] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Најчести страници по настан" className="lg:col-span-2">
            {data.top_dimensions.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-left">
                    <th className="py-1.5 font-medium">Настан</th>
                    <th className="py-1.5 font-medium">Слаг / вредност</th>
                    <th className="py-1.5 text-right font-medium">Број</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_dimensions.map((row) => (
                    <tr key={`${row.event}-${row.dimension}`} className="border-b border-ink/10">
                      <td className="py-1.5">{EVENT_LABELS[row.event] ?? row.event}</td>
                      <td className="py-1.5 font-mono text-xs">{row.dimension}</td>
                      <td className="py-1.5 text-right font-mono">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-graphite">Нема податоци за периодот.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  )
}
