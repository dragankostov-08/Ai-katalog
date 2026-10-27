import { Eye, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { statusLabels } from '../../lib/labels'
import { slugify } from '../../lib/slug'
import type { ContentStatus } from '../../lib/types'
import { useAdmin } from '../AdminApp'
import { adminApi, type Entity } from '../api'
import { AdminPageHeader, Checkbox, ErrorBox, LoadingRows, Panel, SelectField, StatusBadge, TextArea, TextField, useAsync, useToast } from './ui'

export interface BaseForm {
  title: string
  slug: string
  status: ContentStatus
  is_featured: boolean
  seo_title: string
  seo_description: string
}

const str = (value: unknown) => (value === null || value === undefined ? '' : String(value))

export function useEditorState<F extends BaseForm>(empty: F, record: Record<string, unknown> | null, map: (record: Record<string, unknown>, base: F) => F) {
  const [form, setForm] = useState<F>(empty)
  const [slugTouched, setSlugTouched] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!record) return
    const base = { ...empty }
    for (const key of Object.keys(empty) as (keyof F)[]) {
      const value = record[key as string]
      if (typeof empty[key] === 'boolean') (base[key] as unknown) = Boolean(value)
      else if (typeof empty[key] === 'string') (base[key] as unknown) = str(value)
    }
    setForm(map(record, base))
    setSlugTouched(true)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof F>(key: K, value: F[K]) => {
    setDirty(true)
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'title' && !slugTouched) next.slug = slugify(String(value))
      return next
    })
  }
  const setSlug = (value: string) => {
    setSlugTouched(true)
    set('slug', value as F['slug'])
  }
  return { form, set, setSlug, setDirty }
}

export const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())

interface EditorShellProps<F extends BaseForm> {
  entity: Entity
  id?: string
  title: string
  newTitle: string
  listPath: string
  publicPath: string
  form: F
  set: <K extends keyof F>(key: K, value: F[K]) => void
  setSlug: (value: string) => void
  validate: (form: F) => string[]
  save: () => Promise<string>
  onSaved: (id: string) => void
  children: ReactNode
  loading: boolean
  error: string | null
  missing: boolean
  onRetry: () => void
}

/** Shared frame for article, comparison and collection editors. */
export function EditorShell<F extends BaseForm>(props: EditorShellProps<F>) {
  const { entity, id, form, set, setSlug, validate, save, onSaved, children } = props
  const toast = useToast()
  const me = useAdmin()
  const navigate = useNavigate()
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = [
      ...(!form.title.trim() ? ['Насловот е задолжителен.'] : []),
      ...(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug) ? ['Слагот смее да содржи само мали латинични букви, бројки и цртички.'] : []),
      ...(form.seo_title.length > 70 ? ['SEO насловот може да има најмногу 70 знаци.'] : []),
      ...(form.seo_description.length > 170 ? ['SEO описот може да има најмногу 170 знаци.'] : []),
      ...validate(form),
    ]
    setErrors(found)
    if (found.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      const savedId = await save()
      toast('success', 'Зачувано.')
      onSaved(savedId)
      if (!id) navigate(`${props.listPath}/${savedId}`, { replace: true })
    } catch (error) {
      setErrors([(error as Error).message])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || !window.confirm(`Трајно да се избрише „${form.title}“?`)) return
    try {
      await adminApi.remove(entity, id)
      toast('success', 'Избришано.')
      navigate(props.listPath)
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  if (props.loading) return <LoadingRows />
  if (props.error) return <ErrorBox message={props.error} onRetry={props.onRetry} />
  if (props.missing) return <ErrorBox message="Записот не е пронајден." />

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminPageHeader
        title={id ? form.title || props.title : props.newTitle}
        description={id ? <StatusBadge status={form.status} /> : undefined}
        actions={
          <>
            {id ? (
              <a href={`${props.publicPath}/${form.slug}?preview=1`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 border border-ink px-3 text-sm hover:bg-cream">
                <Eye className="h-4 w-4" aria-hidden /> Преглед
              </a>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Се зачувува…' : 'Зачувај'}
            </Button>
          </>
        }
      />
      {errors.length ? (
        <div role="alert" className="mb-6 border-l-4 border-tomato bg-white px-4 py-3 text-sm">
          <p className="font-medium">Поправи ги следниве работи:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Основно">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Наслов" required value={form.title} onChange={(v) => set('title', v as F['title'])} max={160} />
              <TextField label="Слаг (URL)" required value={form.slug} onChange={setSlug} hint={`${props.publicPath}/${form.slug || '…'}`} />
            </div>
          </Panel>
          {children}
          <Panel title="SEO">
            <div className="grid gap-4">
              <TextField label="SEO наслов" value={form.seo_title} onChange={(v) => set('seo_title', v as F['seo_title'])} max={70} />
              <TextArea label="SEO опис" value={form.seo_description} onChange={(v) => set('seo_description', v as F['seo_description'])} rows={2} max={170} />
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Објавување">
            <div className="space-y-3">
              <SelectField
                label="Статус"
                value={form.status}
                onChange={(v) => set('status', (v || 'draft') as F['status'])}
                options={(Object.keys(statusLabels) as ContentStatus[]).map((value) => ({ value, label: statusLabels[value] }))}
              />
              <Checkbox label="Издвоено на почетната" checked={form.is_featured} onChange={(v) => set('is_featured', v as F['is_featured'])} />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Се зачувува…' : 'Зачувај'}
              </Button>
            </div>
          </Panel>
          {id && me.role === 'admin' ? (
            <Panel title="Опасна зона">
              <Button variant="secondary" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" aria-hidden /> Избриши трајно
              </Button>
            </Panel>
          ) : null}
          <p className="text-xs text-graphite">
            <Link to={props.listPath} className="underline">
              ← Назад кон листата
            </Link>
          </p>
        </div>
      </div>
    </form>
  )
}

export { useAsync }
