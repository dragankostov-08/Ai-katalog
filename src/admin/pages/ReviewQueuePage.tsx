import { Link } from 'react-router'
import { VerificationBadge } from '../../components/catalog/Badges'
import { formatShortDate } from '../../lib/format'
import type { ContentStatus, VerificationStatus } from '../../lib/types'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, StatusBadge, useAsync } from '../components/ui'

interface QueueItem {
  id: string
  name: string
  slug: string
  status: ContentStatus
  verification_status: VerificationStatus
  verification_notes?: string | null
  last_verified_at: string | null
  next_review_at?: string | null
  updated_at?: string
  reason?: 'flagged' | 'unverified' | 'due' | 'stale'
}

const REASONS = {
  flagged: 'Означена за ажурирање',
  unverified: 'Никогаш не е проверена',
  due: 'Рокот за проверка помина',
  stale: 'Проверена пред повеќе од 120 дена',
}

export function ReviewQueuePage() {
  const { data, error, loading, reload } = useAsync(
    () => adminApi.reviewQueue() as Promise<unknown> as Promise<{ needs_review: QueueItem[]; verification: QueueItem[] }>,
    [],
  )

  return (
    <>
      <AdminPageHeader title="Проверка" description="Алатки што чекаат уреднички преглед или повторна проверка на цените и функциите." />
      {loading ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <div className="space-y-6">
          <Panel title={`Чекаат преглед пред објавување (${data.needs_review.length})`}>
            {data.needs_review.length ? (
              <ul className="divide-y divide-ink/10">
                {data.needs_review.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-2">
                    <Link to={`/admin/alatki/${item.id}`} className="flex-1 font-medium hover:underline">
                      {item.name}
                    </Link>
                    <VerificationBadge status={item.verification_status} date={item.last_verified_at} />
                    <span className="font-mono text-xs text-graphite">{formatShortDate(item.updated_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite">Нема алатки за преглед.</p>
            )}
          </Panel>
          <Panel title={`Проверка на податоците (${data.verification.length})`}>
            {data.verification.length ? (
              <ul className="divide-y divide-ink/10">
                {data.verification.map((item) => (
                  <li key={item.id} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
                    <div>
                      <Link to={`/admin/alatki/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-xs text-graphite">
                        {item.reason ? REASONS[item.reason] : ''}
                        {item.verification_notes ? ` · ${item.verification_notes}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                    <span className="font-mono text-xs text-graphite">
                      {item.next_review_at ? `рок ${formatShortDate(item.next_review_at)}` : item.last_verified_at ? `пров. ${formatShortDate(item.last_verified_at)}` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite">Сите податоци се ажурни.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  )
}
