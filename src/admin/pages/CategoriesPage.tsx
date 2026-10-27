import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CategoryIcon, CATEGORY_ICONS } from '../../components/catalog/CategoryIcon'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { statusLabels } from '../../lib/labels'
import { slugify, SLUG_PATTERN } from '../../lib/slug'
import type { ContentStatus } from '../../lib/types'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, MarkdownField, SelectField, StatusBadge, TextArea, TextField, useAsync, useToast } from '../components/ui'

type Kind = 'categories' | 'use_cases'
type Row = Record<string, string | number | null>

const ACCENTS = [
  { value: '', label: '—' },
  { value: 'ink', label: 'Мастило' },
  { value: 'tomato', label: 'Домат' },
  { value: 'mustard', label: 'Сенф' },
  { value: 'teal', label: 'Тиркиз' },
  { value: 'raspberry', label: 'Малина' },
]

function EditDialog({ kind, row, onClose, onSaved }: { kind: Kind; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ['id', 'name', 'slug', 'description', 'intro', 'icon', 'accent', 'sort_order', 'status', 'seo_title', 'seo_description', 'task_label'].map((key) => [
        key,
        row?.[key] === null || row?.[key] === undefined ? (key === 'status' ? 'draft' : key === 'sort_order' ? '0' : '') : String(row[key]),
      ]),
    ),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value, ...(key === 'name' && !row ? { slug: slugify(value) } : {}) }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (form.name.trim().length < 2) return setError('Името е задолжително.')
    if (!SLUG_PATTERN.test(form.slug)) return setError('Слагот смее да содржи само мали латинични букви, бројки и цртички.')
    if (kind === 'use_cases' && form.task_label.trim().length < 2) return setError('Формулацијата за прашалникот е задолжителна.')
    setSaving(true)
    try {
      const payload = { ...form, id: form.id || undefined, sort_order: Number(form.sort_order) || 0 }
      if (kind === 'categories') await adminApi.saveCategory(payload)
      else await adminApi.saveUseCase(payload)
      toast('success', 'Зачувано.')
      onSaved()
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title={row ? 'Уреди' : kind === 'categories' ? 'Нова категорија' : 'Нова намена'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Име" required value={form.name} onChange={(v) => set('name', v)} />
          <TextField label="Слаг" required value={form.slug} onChange={(v) => set('slug', v)} />
        </div>
        {kind === 'use_cases' ? (
          <TextField label="Формулација во прашалникот" required value={form.task_label} onChange={(v) => set('task_label', v)} hint="На пр. „Да напишам или уредам текст“" />
        ) : null}
        <TextArea label="Краток опис" value={form.description} onChange={(v) => set('description', v)} rows={2} max={300} />
        {kind === 'categories' ? (
          <>
            <MarkdownField label="Вовед на страницата" value={form.intro} onChange={(v) => set('intro', v)} rows={5} />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Икона" value={form.icon} onChange={(v) => set('icon', v)} options={[{ value: '', label: '—' }, ...Object.keys(CATEGORY_ICONS).map((name) => ({ value: name, label: name }))]} />
              <SelectField label="Акцент" value={form.accent} onChange={(v) => set('accent', v)} options={ACCENTS} />
            </div>
            <TextField label="SEO наслов" value={form.seo_title} onChange={(v) => set('seo_title', v)} max={70} />
            <TextArea label="SEO опис" value={form.seo_description} onChange={(v) => set('seo_description', v)} rows={2} max={170} />
          </>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Редослед" type="number" value={form.sort_order} onChange={(v) => set('sort_order', v)} />
          <SelectField
            label="Статус"
            value={form.status}
            onChange={(v) => set('status', v || 'draft')}
            options={(Object.keys(statusLabels) as ContentStatus[]).map((value) => ({ value, label: statusLabels[value] }))}
          />
        </div>
        {error ? <ErrorBox message={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Откажи
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Се зачувува…' : 'Зачувај'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export function CategoriesPage() {
  const [kind, setKind] = useState<Kind>('categories')
  const [editing, setEditing] = useState<Row | null | 'new'>(null)
  const { data, error, loading, reload } = useAsync(() => adminApi.list<Row>(kind, undefined, undefined, 200), [kind])

  return (
    <>
      <AdminPageHeader
        title="Категории и намени"
        description="Структура на каталогот. Категориите без објавени алатки јавно се прикажуваат како „Во подготовка“."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden /> {kind === 'categories' ? 'Нова категорија' : 'Нова намена'}
          </Button>
        }
      />
      <div role="tablist" className="mb-4 flex gap-1">
        {(['categories', 'use_cases'] as Kind[]).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={kind === value}
            onClick={() => setKind(value)}
            className={`px-3 py-1.5 text-sm ${kind === value ? 'bg-ink text-paper' : 'border border-ink/30'}`}
          >
            {value === 'categories' ? 'Категории' : 'Намени'}
          </button>
        ))}
      </div>
      {loading && !data ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <ul className="divide-y divide-ink/10 border border-ink/25 bg-white">
          {data?.items.map((row) => (
            <li key={String(row.id)} className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-8 font-mono text-xs text-graphite">{row.sort_order}</span>
              {kind === 'categories' ? <CategoryIcon name={row.icon as string} /> : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.name}</p>
                <p className="truncate text-xs text-graphite">{kind === 'use_cases' ? row.task_label : row.description}</p>
              </div>
              <StatusBadge status={row.status as ContentStatus} />
              <button type="button" onClick={() => setEditing(row)} className="inline-flex items-center gap-1 text-sm underline">
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Уреди
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <EditDialog
          key={editing === 'new' ? 'new' : String(editing.id)}
          kind={kind}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      ) : null}
    </>
  )
}
