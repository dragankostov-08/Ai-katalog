import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router'
import { formatShortDate } from '../../lib/format'
import { statusLabels } from '../../lib/labels'
import type { ContentStatus } from '../../lib/types'
import { useAdmin } from '../AdminApp'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, useAsync } from '../components/ui'

interface Dashboard {
  tools: Partial<Record<ContentStatus, number>>
  articles: Partial<Record<ContentStatus, number>>
  comparisons: Partial<Record<ContentStatus, number>>
  collections: Partial<Record<ContentStatus, number>>
  pending_submissions: number
  new_messages: number
  verification_due: number
  clicks_30d: number
  missing_settings: string[]
  recent_updates: { field_changed: string; old_value: string | null; new_value: string | null; note: string | null; verified_at: string; tool_name: string; tool_id: string }[]
}

const SECTIONS: { key: 'tools' | 'articles' | 'comparisons' | 'collections'; label: string; to: string }[] = [
  { key: 'tools', label: 'Алатки', to: '/admin/alatki' },
  { key: 'articles', label: 'Водичи', to: '/admin/vodici' },
  { key: 'comparisons', label: 'Споредби', to: '/admin/sporedbi' },
  { key: 'collections', label: 'Листи', to: '/admin/kolekcii' },
]

const SETTING_LABELS: Record<string, string> = { contact_email: 'е-пошта за контакт', publisher_name: 'име на издавачот' }

export function DashboardPage() {
  const { data, error, loading, reload } = useAsync(() => adminApi.dashboard() as Promise<unknown> as Promise<Dashboard>, [])
  const me = useAdmin()

  return (
    <>
      <AdminPageHeader title="Преглед" description="Состојба на содржината и задачи што чекаат." />
      {loading ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <div className="space-y-6">
          {data.missing_settings.length ? (
            <div className="flex gap-3 border-l-4 border-mustard bg-white px-4 py-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-tomato-ink" aria-hidden />
              <p>
                Недостасуваат податоци за правните страници: {data.missing_settings.map((key) => SETTING_LABELS[key] ?? key).join(', ')}.{' '}
                {me.role === 'admin' ? (
                  <Link to="/admin/postavki" className="underline">
                    Внеси ги во Поставки.
                  </Link>
                ) : (
                  'Ги внесува администратор.'
                )} Прегледај ги текстовите за приватност и услови со правен советник пред јавно лансирање.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'За проверка', value: data.verification_due, to: '/admin/proverka' },
              { label: 'Нови предлози', value: data.pending_submissions, to: '/admin/predlozi' },
              { label: 'Нови пораки', value: data.new_messages, to: '/admin/poraki' },
              { label: 'Кликови (30 дена)', value: data.clicks_30d, to: '/admin/analitika' },
            ].map((stat) => (
              <Link key={stat.label} to={stat.to} className="border border-ink bg-white p-4 hover:shadow-offset-sm">
                <p className="label-mono text-graphite">{stat.label}</p>
                <p className="mt-1 font-display text-3xl font-black">{stat.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Содржина по статус">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-left">
                    <th className="py-1.5 font-medium">Тип</th>
                    {(['published', 'needs_review', 'draft', 'archived'] as ContentStatus[]).map((status) => (
                      <th key={status} className="py-1.5 text-right font-mono text-xs font-normal text-graphite">
                        {statusLabels[status]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SECTIONS.map((section) => (
                    <tr key={section.key} className="border-b border-ink/10">
                      <td className="py-2">
                        <Link to={section.to} className="underline-offset-2 hover:underline">
                          {section.label}
                        </Link>
                      </td>
                      {(['published', 'needs_review', 'draft', 'archived'] as ContentStatus[]).map((status) => (
                        <td key={status} className="py-2 text-right font-mono">
                          {data[section.key][status] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Последни промени во податоците">
              {data.recent_updates.length ? (
                <ul className="divide-y divide-ink/10 text-sm">
                  {data.recent_updates.map((update, index) => (
                    <li key={index} className="py-2">
                      <Link to={`/admin/alatki/${update.tool_id}`} className="font-medium hover:underline">
                        {update.tool_name}
                      </Link>{' '}
                      <span className="font-mono text-xs text-graphite">{update.field_changed}</span>
                      <span className="block text-xs text-graphite">
                        {formatShortDate(update.verified_at)} · {update.note ?? `${update.old_value ?? '—'} → ${update.new_value ?? '—'}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-graphite">Сè уште нема промени.</p>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </>
  )
}
