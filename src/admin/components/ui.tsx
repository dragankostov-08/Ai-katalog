import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Markdown } from '../../lib/markdown'
import { statusLabels } from '../../lib/labels'
import type { ContentStatus } from '../../lib/types'

/* ------------------------------------------------------------------------- */
/* Layout                                                                     */
/* ------------------------------------------------------------------------- */

export function AdminPageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-graphite">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Panel({ title, children, actions, className = '' }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`border border-ink/25 bg-white ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-2 border-b border-ink/15 px-4 py-2.5">
          <h2 className="label-mono text-graphite">{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

const statusStyles: Record<ContentStatus, string> = {
  published: 'bg-teal text-white',
  draft: 'bg-light text-ink',
  needs_review: 'bg-mustard text-ink',
  archived: 'bg-graphite text-paper',
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`inline-block rounded-xs px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase ${statusStyles[status]}`}>{statusLabels[status]}</span>
}

/* ------------------------------------------------------------------------- */
/* Form controls                                                              */
/* ------------------------------------------------------------------------- */

export const controlClass =
  'block w-full rounded-xs border border-ink/35 bg-white px-2.5 py-2 text-sm focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-tomato disabled:bg-paper'

interface BaseFieldProps {
  label: string
  hint?: ReactNode
  required?: boolean
  className?: string
}

function FieldShell({ label, hint, required, className = '', id, children, counter }: BaseFieldProps & { id: string; children: ReactNode; counter?: ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required ? <span className="text-tomato-ink"> *</span> : null}
        </label>
        {counter}
      </div>
      {children}
      {hint ? <p className="mt-1 text-xs text-graphite">{hint}</p> : null}
    </div>
  )
}

function Counter({ value, max }: { value: string; max?: number }) {
  if (!max) return null
  return <span className={`font-mono text-[0.6875rem] ${value.length > max ? 'text-tomato-ink' : 'text-graphite'}`}>{value.length}/{max}</span>
}

export function TextField({
  value,
  onChange,
  type = 'text',
  max,
  placeholder,
  ...shell
}: BaseFieldProps & { value: string; onChange: (value: string) => void; type?: string; max?: number; placeholder?: string }) {
  const id = useId()
  return (
    <FieldShell {...shell} id={id} counter={<Counter value={value} max={max} />}>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={shell.required} className={controlClass} />
    </FieldShell>
  )
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  max,
  ...shell
}: BaseFieldProps & { value: string; onChange: (value: string) => void; rows?: number; max?: number }) {
  const id = useId()
  return (
    <FieldShell {...shell} id={id} counter={<Counter value={value} max={max} />}>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={controlClass} />
    </FieldShell>
  )
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ...shell
}: BaseFieldProps & { value: T | ''; onChange: (value: T | '') => void; options: { value: T | ''; label: string }[] }) {
  const id = useId()
  return (
    <FieldShell {...shell} id={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | '')} className={controlClass}>
        {options.map((option) => (
          <option key={option.value || 'empty'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function Checkbox({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
      <span>
        {label}
        {hint ? <span className="block text-xs text-graphite">{hint}</span> : null}
      </span>
    </label>
  )
}

export function CheckboxGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T[]
  onChange: (value: T[]) => void
  columns?: 2 | 3
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className={`grid gap-1.5 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={(checked) => onChange(checked ? [...value, option.value] : value.filter((v) => v !== option.value))}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Editable list of short strings (pros, cons, keywords). */
export function ListEditor({ label, value, onChange, placeholder, hint }: { label: string; value: string[]; onChange: (value: string[]) => void; placeholder?: string; hint?: string }) {
  const [draft, setDraft] = useState('')
  const id = useId()
  const add = () => {
    const item = draft.trim()
    if (item && !value.includes(item)) onChange([...value, item])
    setDraft('')
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {value.length ? (
        <ul className="mb-2 space-y-1">
          {value.map((item, index) => (
            <li key={item} className="flex items-start gap-2 border border-ink/15 bg-paper px-2 py-1 text-sm">
              <span className="flex-1">{item}</span>
              <button type="button" aria-label={`Нагоре: ${item}`} disabled={index === 0} onClick={() => onChange(move(value, index, -1))} className="disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={`Отстрани: ${item}`} onClick={() => onChange(value.filter((v) => v !== item))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className={controlClass}
        />
        <button type="button" onClick={add} className="shrink-0 border border-ink px-3 text-sm hover:bg-cream">
          Додај
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-graphite">{hint}</p> : null}
    </div>
  )
}

export function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return list
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Markdown textarea with a live preview using the public renderer. */
export function MarkdownField({ label, value, onChange, rows = 12, hint, required }: BaseFieldProps & { value: string; onChange: (value: string) => void; rows?: number }) {
  const [preview, setPreview] = useState(false)
  const id = useId()
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required ? <span className="text-tomato-ink"> *</span> : null}
        </label>
        <div className="flex gap-1 text-xs">
          <button type="button" onClick={() => setPreview(false)} className={`inline-flex items-center gap-1 px-2 py-1 ${!preview ? 'bg-ink text-paper' : 'border border-ink/30'}`}>
            <Pencil className="h-3 w-3" /> Уреди
          </button>
          <button type="button" onClick={() => setPreview(true)} className={`inline-flex items-center gap-1 px-2 py-1 ${preview ? 'bg-ink text-paper' : 'border border-ink/30'}`}>
            <Eye className="h-3 w-3" /> Преглед
          </button>
        </div>
      </div>
      {preview ? (
        <div className="min-h-32 border border-ink/25 bg-paper p-4">
          {value.trim() ? <Markdown source={value} /> : <p className="text-sm text-graphite">Нема содржина.</p>}
        </div>
      ) : (
        <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${controlClass} font-mono text-[0.8125rem] leading-relaxed`} />
      )}
      <p className="mt-1 text-xs text-graphite">
        {hint ?? 'Markdown: ## наслов, **задебелено**, *курзив*, [линк](/alatka/slug), - листа, | табела |, :::sovet … ::: за забелешки.'}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Ordered picker for tools inside comparisons, collections and guides         */
/* ------------------------------------------------------------------------- */

export function OrderedPicker<T extends { tool_id: string }>({
  label,
  options,
  value,
  onChange,
  create,
  renderExtra,
}: {
  label: string
  options: { id: string; name: string; status: ContentStatus }[]
  value: T[]
  onChange: (value: T[]) => void
  create: (toolId: string) => T
  renderExtra?: (item: T, update: (patch: Partial<T>) => void) => ReactNode
}) {
  const [selected, setSelected] = useState('')
  const available = options.filter((option) => !value.some((item) => item.tool_id === option.id))
  const name = (id: string) => options.find((o) => o.id === id)
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <ol className="space-y-2">
        {value.map((item, index) => {
          const option = name(item.tool_id)
          return (
            <li key={item.tool_id} className="border border-ink/20 bg-paper p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-graphite">{index + 1}.</span>
                <span className="flex-1 font-medium">{option?.name ?? item.tool_id}</span>
                {option && option.status !== 'published' ? <StatusBadge status={option.status} /> : null}
                <button type="button" aria-label="Нагоре" disabled={index === 0} onClick={() => onChange(move(value, index, -1))} className="p-1 disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Надолу" disabled={index === value.length - 1} onClick={() => onChange(move(value, index, 1))} className="p-1 disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Отстрани" onClick={() => onChange(value.filter((v) => v.tool_id !== item.tool_id))} className="p-1 text-tomato-ink">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {renderExtra ? (
                <div className="mt-3">{renderExtra(item, (patch) => onChange(value.map((v) => (v.tool_id === item.tool_id ? { ...v, ...patch } : v))))}</div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor={`${label}-picker`}>
          Додај алатка
        </label>
        <select id={`${label}-picker`} value={selected} onChange={(e) => setSelected(e.target.value)} className={controlClass}>
          <option value="">Избери алатка…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.status !== 'published' ? ` (${statusLabels[option.status]})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            onChange([...value, create(selected)])
            setSelected('')
          }}
          className="inline-flex shrink-0 items-center gap-1 border border-ink px-3 text-sm hover:bg-cream disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Додај
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* ------------------------------------------------------------------------- */

interface Toast {
  id: number
  tone: 'success' | 'error'
  message: string
}

const ToastContext = createContext<(tone: Toast['tone'], message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, tone, message }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), tone === 'error' ? 8000 : 4000)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`border-l-4 bg-white px-4 py-3 text-sm shadow-paper ${toast.tone === 'error' ? 'border-tomato' : 'border-teal'}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/* ------------------------------------------------------------------------- */
/* Data loading                                                               */
/* ------------------------------------------------------------------------- */

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true, error: null }))
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error: Error) => !cancelled && setState({ data: null, error: error.message, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])
  return { ...state, reload: () => setVersion((v) => v + 1) }
}

export function LoadingRows() {
  return (
    <div aria-busy="true" className="space-y-2">
      <span className="sr-only">Се вчитува…</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse bg-light/50" />
      ))}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-l-4 border-tomato bg-white px-4 py-3 text-sm">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 underline">
          Обиди се повторно
        </button>
      ) : null}
    </div>
  )
}
