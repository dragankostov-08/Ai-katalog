import { useId, type ReactNode } from 'react'

export const inputClasses =
  'block w-full rounded-xs border border-ink/40 bg-white px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-mid focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-tomato aria-[invalid=true]:border-tomato'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => ReactNode
  className?: string
}

/** Label + control + hint + error wiring with correct ARIA relationships. */
export function Field({ label, hint, error, required, children, className = '' }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? <span className="text-tomato-ink"> *</span> : <span className="font-normal text-graphite"> (незадолжително)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-graphite">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-tomato-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Hidden trap field for bots. Humans never see or fill it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Веб-страница
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}

export function FormMessage({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-l-4 bg-white px-4 py-3 text-sm ${tone === 'error' ? 'border-tomato' : 'border-teal'}`}
    >
      {children}
    </div>
  )
}
