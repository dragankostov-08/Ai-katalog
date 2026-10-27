import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { useAdmin } from '../AdminApp'
import { adminApi } from '../api'
import { AdminPageHeader, controlClass, ErrorBox, LoadingRows, useAsync, useToast } from '../components/ui'

interface Submission {
  id: string
  proposed_name: string
  proposed_url: string
  explanation: string
  submitter_email: string | null
  status: string
  moderator_note: string | null
  created_at: string
}

const STATUSES = [
  { value: 'pending', label: 'Чекаат' },
  { value: 'approved', label: 'Прифатени' },
  { value: 'rejected', label: 'Одбиени' },
  { value: 'spam', label: 'Спам' },
]

function SubmissionItem({ item, onDone }: { item: Submission; onDone: () => void }) {
  const toast = useToast()
  const me = useAdmin()
  const [note, setNote] = useState(item.moderator_note ?? '')
  const [busy, setBusy] = useState(false)

  async function decide(status: string) {
    setBusy(true)
    try {
      await adminApi.updateSubmission(item.id, status, note)
      toast('success', 'Предлогот е ажуриран.')
      onDone()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Трајно да се избрише предлогот?')) return
    try {
      await adminApi.remove('submissions', item.id)
      onDone()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  return (
    <li className="border border-ink/25 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">{item.proposed_name}</p>
          <a href={item.proposed_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm break-all underline">
            {item.proposed_url} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
        <span className="font-mono text-xs text-graphite">{formatShortDate(item.created_at)}</span>
      </div>
      {item.explanation ? <p className="mt-2 text-sm whitespace-pre-line">{item.explanation}</p> : null}
      {item.submitter_email ? <p className="mt-1 text-xs text-graphite">Контакт: {item.submitter_email}</p> : null}
      <label htmlFor={`note-${item.id}`} className="mt-3 mb-1 block text-xs font-medium">
        Интерна белешка
      </label>
      <input id={`note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} className={controlClass} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide('approved')}>
          Прифати
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide('rejected')}>
          Одбиј
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('spam')}>
          Спам
        </Button>
        <Link to="/admin/alatki/nova" className="ml-auto self-center text-sm underline">
          Креирај алатка
        </Link>
        {me.role === 'admin' ? (
          <button type="button" onClick={remove} className="self-center text-sm text-tomato-ink underline">
            Избриши
          </button>
        ) : null}
      </div>
    </li>
  )
}

export function SubmissionsPage() {
  const [status, setStatus] = useState('pending')
  const { data, error, loading, reload } = useAsync(() => adminApi.submissions(status) as Promise<unknown> as Promise<Submission[]>, [status])

  return (
    <>
      <AdminPageHeader title="Предлози од посетители" description="Ниту еден предлог не се објавува автоматски. Прифаќањето не креира алатка — тоа го правиш рачно по проверка." />
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`px-3 py-1.5 text-sm ${status === option.value ? 'bg-ink text-paper' : 'border border-ink/30'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {loading ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : data?.length ? (
        <ul className="space-y-3">
          {data.map((item) => (
            <SubmissionItem key={item.id} item={item} onDone={reload} />
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-ink/30 bg-white p-6 text-center text-sm text-graphite">Нема предлози.</p>
      )}
    </>
  )
}
