import { Eye, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { VerificationBadge } from '../../components/catalog/Badges'
import { buttonClasses } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { statusLabels } from '../../lib/labels'
import type { ContentStatus, VerificationStatus } from '../../lib/types'
import { adminApi, type Entity } from '../api'
import { AdminPageHeader, controlClass, ErrorBox, LoadingRows, StatusBadge, useAsync } from '../components/ui'

const CONFIG: Record<'tools' | 'articles' | 'comparisons' | 'collections', { title: string; base: string; publicBase: string; newPath: string; newLabel: string }> = {
  tools: { title: 'Алатки', base: '/admin/alatki', publicBase: '/alatka', newPath: '/admin/alatki/nova', newLabel: 'Нова алатка' },
  articles: { title: 'Водичи', base: '/admin/vodici', publicBase: '/vodici', newPath: '/admin/vodici/nov', newLabel: 'Нов водич' },
  comparisons: { title: 'Споредби', base: '/admin/sporedbi', publicBase: '/sporedbi', newPath: '/admin/sporedbi/nova', newLabel: 'Нова споредба' },
  collections: { title: 'Уреднички листи', base: '/admin/kolekcii', publicBase: '/najdobri', newPath: '/admin/kolekcii/nova', newLabel: 'Нова листа' },
}

interface Row {
  id: string
  name?: string
  title?: string
  slug: string
  status: ContentStatus
  updated_at: string
  is_featured?: boolean
  verification_status?: VerificationStatus
  last_verified_at?: string | null
}

const PAGE = 50

export function ContentList({ entity }: { entity: keyof typeof CONFIG }) {
  const config = CONFIG[entity]
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const { data, error, loading, reload } = useAsync(
    () => adminApi.list<Row>(entity as Entity, status, submittedQuery, limit),
    [entity, status, submittedQuery, limit],
  )

  return (
    <>
      <AdminPageHeader
        title={config.title}
        description={data ? `${data.total} записи` : undefined}
        actions={
          <Link to={config.newPath} className={buttonClasses('primary', 'md')}>
            <Plus className="h-4 w-4" aria-hidden /> {config.newLabel}
          </Link>
        }
      />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query)
          setLimit(PAGE)
        }}
      >
        <label htmlFor="list-search" className="sr-only">
          Пребарај
        </label>
        <input id="list-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пребарај по име или слаг…" className={`${controlClass} max-w-xs`} />
        <label htmlFor="list-status" className="sr-only">
          Статус
        </label>
        <select
          id="list-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setLimit(PAGE)
          }}
          className={`${controlClass} w-auto`}
        >
          <option value="">Сите статуси</option>
          {(Object.keys(statusLabels) as ContentStatus[]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
        <button type="submit" className="border border-ink px-3 text-sm hover:bg-cream">
          Барај
        </button>
      </form>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <LoadingRows /> : data ? (
        data.items.length ? (
          <div className="overflow-x-auto border border-ink/25 bg-white">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-ink text-left">
                  <th className="px-3 py-2 font-medium">Наслов</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  {entity === 'tools' ? <th className="px-3 py-2 font-medium">Проверка</th> : null}
                  <th className="px-3 py-2 font-medium">Изменето</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Акции</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id} className="border-b border-ink/10 hover:bg-paper">
                    <td className="px-3 py-2">
                      <Link to={`${config.base}/${row.id}`} className="font-medium hover:underline">
                        {row.name ?? row.title}
                      </Link>
                      {row.is_featured ? <span className="ml-2 font-mono text-[0.625rem] text-tomato-ink uppercase">издвоено</span> : null}
                      <span className="block font-mono text-xs text-graphite">{row.slug}</span>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    {entity === 'tools' ? (
                      <td className="px-3 py-2">
                        {row.verification_status ? <VerificationBadge status={row.verification_status} date={row.last_verified_at} /> : null}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 font-mono text-xs">{formatShortDate(row.updated_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`${config.publicBase}/${row.slug}${row.status === 'published' ? '' : '?preview=1'}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-xs underline"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden /> {row.status === 'published' ? 'Отвори' : 'Преглед'}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.total > data.items.length ? (
              <div className="p-3 text-center">
                <button type="button" className="border border-ink px-4 py-1.5 text-sm hover:bg-cream" onClick={() => setLimit(limit + PAGE)} disabled={loading}>
                  {loading ? 'Се вчитува…' : `Прикажи уште (${data.total - data.items.length})`}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="border border-dashed border-ink/30 bg-white p-6 text-center text-sm text-graphite">Нема записи за избраните филтри.</p>
        )
      ) : null}
    </>
  )
}
