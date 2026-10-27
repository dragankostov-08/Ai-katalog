import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, useAsync, useToast } from '../components/ui'

interface Message {
  id: string
  name: string
  email: string
  topic: string
  message: string
  status: string
  created_at: string
}

const TOPICS: Record<string, string> = { general: 'Општо', correction: 'Корекција', advertising: 'Огласување', privacy: 'Приватност' }
const STATUSES = [
  { value: 'new', label: 'Нови' },
  { value: 'read', label: 'Прочитани' },
  { value: 'archived', label: 'Архива' },
]

export function MessagesPage() {
  const toast = useToast()
  const [status, setStatus] = useState('new')
  const { data, error, loading, reload } = useAsync(() => adminApi.messages(status) as Promise<unknown> as Promise<Message[]>, [status])

  async function mark(id: string, next: string) {
    try {
      await adminApi.updateMessage(id, next)
      reload()
    } catch (caught) {
      toast('error', (caught as Error).message)
    }
  }

  return (
    <>
      <AdminPageHeader title="Пораки" description="Пораки од формуларот за контакт." />
      <div className="mb-4 flex gap-1">
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
          {data.map((message) => (
            <li key={message.id} className="border border-ink/25 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {message.name} · <a className="underline" href={`mailto:${message.email}`}>{message.email}</a>
                </p>
                <span className="font-mono text-xs text-graphite">
                  {TOPICS[message.topic] ?? message.topic} · {formatShortDate(message.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm whitespace-pre-line">{message.message}</p>
              <div className="mt-3 flex gap-2">
                {message.status !== 'read' ? (
                  <Button size="sm" variant="secondary" onClick={() => mark(message.id, 'read')}>
                    Означи прочитано
                  </Button>
                ) : null}
                {message.status !== 'archived' ? (
                  <Button size="sm" variant="ghost" onClick={() => mark(message.id, 'archived')}>
                    Архивирај
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-ink/30 bg-white p-6 text-center text-sm text-graphite">Нема пораки.</p>
      )}
    </>
  )
}
