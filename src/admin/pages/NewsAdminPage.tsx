import { EyeOff, Pencil, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { formatShortDate } from '../../lib/format'
import { useAdmin } from '../AdminApp'
import { adminApi, type AdminNewsSource } from '../api'
import { AdminPageHeader, Checkbox, controlClass, ErrorBox, LoadingRows, Panel, SelectField, TextField, useAsync, useToast } from '../components/ui'

type Draft = Pick<AdminNewsSource, 'name' | 'site_url' | 'feed_url' | 'language' | 'ai_filter' | 'is_active'> & { id?: string }

const EMPTY: Draft = { name: '', site_url: 'https://', feed_url: 'https://', language: 'mk', ai_filter: true, is_active: true }

function SourceDialog({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<Draft>(draft)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((current) => ({ ...current, [key]: value }))

  async function save() {
    if (form.name.trim().length < 2) return toast('error', 'Внеси име на изворот.')
    if (!/^https:\/\/\S+$/.test(form.site_url)) return toast('error', 'Адресата на сајтот мора да почнува со https://')
    if (!/^https?:\/\/\S+$/.test(form.feed_url)) return toast('error', 'Внеси ја адресата на RSS/Atom фидот.')
    setSaving(true)
    try {
      await adminApi.saveNewsSource(form)
      toast('success', 'Изворот е зачуван.')
      onSaved()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={draft.id ? 'Уреди извор' : 'Нов извор на вести'}>
      <div className="space-y-4">
        <TextField label="Име" required value={form.name} onChange={(v) => set('name', v)} placeholder="на пр. IT.mk" />
        <TextField label="Сајт" required value={form.site_url} onChange={(v) => set('site_url', v)} />
        <TextField label="RSS / Atom фид" required value={form.feed_url} onChange={(v) => set('feed_url', v)} hint="Кај WordPress сајтови обично е /feed/ на крајот на адресата." />
        <SelectField
          label="Јазик"
          value={form.language}
          onChange={(v) => set('language', (v || 'mk') as Draft['language'])}
          options={[
            { value: 'mk', label: 'Македонски' },
            { value: 'en', label: 'Англиски' },
            { value: 'other', label: 'Друг' },
          ]}
        />
        <Checkbox label="Само вести за AI" hint="Вклучи за општи технолошки портали: се зачувуваат само вести што спомнуваат AI." checked={form.ai_filter} onChange={(v) => set('ai_filter', v)} />
        <Checkbox label="Активен" checked={form.is_active} onChange={(v) => set('is_active', v)} />
        <p className="text-xs text-graphite">
          Користи само јавни фидови. Зачувуваме наслов, краток опис и линк до оригиналот — не целиот текст. Ако изворот побара, исклучи го.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Откажи
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Се зачувува…' : 'Зачувај'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export function NewsAdminPage() {
  const toast = useToast()
  const me = useAdmin()
  const sources = useAsync(() => adminApi.newsSources(), [])
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const items = useAsync(() => adminApi.newsItems(submitted), [submitted])
  const [editing, setEditing] = useState<Draft | null>(null)
  const [fetching, setFetching] = useState(false)

  async function refresh(sourceId?: string) {
    setFetching(true)
    try {
      const { report } = await adminApi.fetchNewsNow(sourceId)
      toast('success', report.map((r) => (r.error ? `${r.source}: грешка (${r.error})` : `${r.source}: ${r.added} нови`)).join(' · ') || 'Нема активни извори.')
      sources.reload()
      items.reload()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setFetching(false)
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    try {
      await adminApi.setNewsHidden(id, hidden)
      items.reload()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  async function removeSource(source: AdminNewsSource) {
    if (!window.confirm(`Да се избрише „${source.name}“ заедно со сите негови вести?`)) return
    try {
      await adminApi.remove('news_sources', source.id)
      sources.reload()
      items.reload()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="AI вести"
        description="Насловите се преземаат автоматски од RSS фидовите на изворите (на секој час преку закажаната функција)."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(EMPTY)}>
              <Plus className="h-4 w-4" aria-hidden /> Нов извор
            </Button>
            <Button onClick={() => refresh()} disabled={fetching}>
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} aria-hidden /> Освежи сега
            </Button>
          </>
        }
      />
      <div className="space-y-6">
        <Panel title="Извори">
          {sources.loading && !sources.data ? <LoadingRows /> : sources.error ? <ErrorBox message={sources.error} onRetry={sources.reload} /> : sources.data?.length ? (
            <ul className="divide-y divide-light">
              {sources.data.map((source) => (
                <li key={source.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {source.name} {!source.is_active ? <span className="ml-1 rounded-full bg-cream px-2 py-0.5 text-xs text-graphite">исклучен</span> : null}
                    </p>
                    <p className="truncate text-xs text-graphite">{source.feed_url}</p>
                    <p className="text-xs">
                      {source.last_status === 'error' ? (
                        <span className="text-tomato-ink">Грешка: {source.last_error}</span>
                      ) : source.last_fetched_at ? (
                        <span className="text-teal-ink">Последно преземање {formatShortDate(source.last_fetched_at)}</span>
                      ) : (
                        <span className="text-graphite">Сè уште не е преземано</span>
                      )}
                      <span className="text-graphite"> · {source.item_count} вести</span>
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => refresh(source.id)} disabled={fetching || !source.is_active}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Тестирај
                  </Button>
                  <button type="button" onClick={() => setEditing(source)} className="inline-flex items-center gap-1 underline">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Уреди
                  </button>
                  {me.role === 'admin' ? (
                    <button type="button" onClick={() => removeSource(source)} className="text-tomato-ink underline">
                      Избриши
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite">Нема извори. Додади го првиот (на пр. IT.mk со фид https://it.mk/feed/).</p>
          )}
        </Panel>

        <Panel title="Последни вести">
          <form
            className="mb-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSubmitted(query)
            }}
          >
            <label htmlFor="news-search" className="sr-only">
              Пребарај вести
            </label>
            <input id="news-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пребарај по наслов…" className={controlClass} />
            <Button type="submit" variant="secondary">
              Барај
            </Button>
          </form>
          {items.loading && !items.data ? <LoadingRows /> : items.data?.length ? (
            <ul className="divide-y divide-light">
              {items.data.map((item) => (
                <li key={item.id} className={`flex items-start gap-3 py-2.5 text-sm ${item.is_hidden ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {item.title}
                    </a>
                    <p className="text-xs text-graphite">
                      {item.source.name} · {formatShortDate(item.published_at)}
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleHidden(item.id, !item.is_hidden)} className="inline-flex shrink-0 items-center gap-1 text-xs underline">
                    <EyeOff className="h-3.5 w-3.5" aria-hidden /> {item.is_hidden ? 'Прикажи' : 'Скриј'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-graphite">Нема вести.</p>
          )}
        </Panel>
      </div>
      {editing ? (
        <SourceDialog
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            sources.reload()
          }}
        />
      ) : null}
    </>
  )
}
