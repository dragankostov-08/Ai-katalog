import { Link } from 'react-router'
import { formatShortDate } from '../../lib/format'
import { env } from '../../lib/env'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, useAsync } from '../components/ui'

const QUEUE_LABELS: Record<string, string> = { pending: 'Чекаат', sending: 'Се праќаат', sent: 'Испратени', failed: 'Неуспешни', cancelled: 'Откажани' }
const WATCHER_LABELS: Record<string, string> = { pending: 'Непотврдени', active: 'Активни', unsubscribed: 'Одјавени' }

export function NotificationsPage() {
  const { data, error, loading, reload } = useAsync(() => adminApi.notificationStats(), [])
  return (
    <>
      <AdminPageHeader
        title="Известувања за цени"
        description="Посетителите добиваат е-пошта кога уредник ќе потврди промена на цената или планот на алатка што ја следат (со двојна потврда)."
      />
      {!env.featureAlerts ? (
        <p className="mb-6 border-l-4 border-mustard bg-white px-4 py-3 text-sm">
          Формуларот за следење не е вклучен на сајтот (VITE_FEATURE_ALERTS). Прво постави ја функцијата за праќање е-пошта — види docs/ALERTS.md.
        </p>
      ) : null}
      {loading ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Ред за праќање">
            <dl className="divide-y divide-ink/10 text-sm">
              {Object.keys(QUEUE_LABELS).map((key) => (
                <div key={key} className="flex justify-between py-1.5">
                  <dt>{QUEUE_LABELS[key]}</dt>
                  <dd className="font-mono">{data.queue[key] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Следачи">
            <dl className="divide-y divide-ink/10 text-sm">
              {Object.keys(WATCHER_LABELS).map((key) => (
                <div key={key} className="flex justify-between py-1.5">
                  <dt>{WATCHER_LABELS[key]}</dt>
                  <dd className="font-mono">{data.watchers[key] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Најследени алатки">
            {data.top_tools.length ? (
              <ul className="divide-y divide-ink/10 text-sm">
                {data.top_tools.map((tool) => (
                  <li key={tool.slug} className="flex justify-between py-1.5">
                    <Link to={`/alatka/${tool.slug}`} className="hover:underline">
                      {tool.name}
                    </Link>
                    <span className="font-mono">{tool.watchers}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite">Сè уште нема активни следачи.</p>
            )}
          </Panel>
          <Panel title="Последни неуспешни праќања">
            {data.failures.length ? (
              <ul className="space-y-2 text-sm">
                {data.failures.map((failure, index) => (
                  <li key={index} className="border-b border-ink/10 pb-2">
                    <span className="font-mono text-xs">
                      {failure.kind} · {failure.attempts} обиди · {formatShortDate(failure.updated_at)}
                    </span>
                    <span className="block text-graphite">{failure.last_error}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite">Нема неуспешни праќања.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  )
}
