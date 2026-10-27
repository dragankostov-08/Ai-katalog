import { Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, useAsync } from '../components/ui'

interface NewsletterData {
  subscribed: number
  unsubscribed: number
  subscribers: { email: string; consent_at: string; consent_version: string; status: string; unsubscribed_at: string | null }[]
}

function exportCsv(rows: NewsletterData['subscribers']) {
  const active = rows.filter((row) => row.status === 'subscribed')
  const csv = ['email,consent_at,consent_version', ...active.map((row) => `${row.email},${row.consent_at},${row.consent_version}`)].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `bilten-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function NewsletterPage() {
  const { data, error, loading, reload } = useAsync(() => adminApi.newsletter() as Promise<unknown> as Promise<NewsletterData>, [])
  return (
    <>
      <AdminPageHeader
        title="Билтен"
        description="Лични податоци — видливи само за администратори. Праќај пораки само на активни претплатници и секогаш вклучи линк за одјава."
        actions={
          data ? (
            <Button variant="secondary" onClick={() => exportCsv(data.subscribers)}>
              <Download className="h-4 w-4" aria-hidden /> Извези активни (CSV)
            </Button>
          ) : null
        }
      />
      {loading ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Активни">
              <p className="font-display text-3xl font-black">{data.subscribed}</p>
            </Panel>
            <Panel title="Одјавени">
              <p className="font-display text-3xl font-black">{data.unsubscribed}</p>
            </Panel>
          </div>
          <Panel title="Претплатници">
            {data.subscribers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-ink/20 text-left">
                      <th className="py-1.5 font-medium">Е-пошта</th>
                      <th className="py-1.5 font-medium">Согласност</th>
                      <th className="py-1.5 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscribers.map((row) => (
                      <tr key={row.email} className="border-b border-ink/10">
                        <td className="py-1.5">{row.email}</td>
                        <td className="py-1.5 font-mono text-xs">
                          {formatShortDate(row.consent_at)} · {row.consent_version}
                        </td>
                        <td className="py-1.5">{row.status === 'subscribed' ? 'Активен' : `Одјавен ${formatShortDate(row.unsubscribed_at)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-graphite">Сè уште нема претплатници.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  )
}
