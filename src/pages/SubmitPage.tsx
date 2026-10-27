import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field, FormMessage, Honeypot, inputClasses } from '../components/forms/Field'
import { StaticPage } from '../components/layout/StaticPage'
import { Button } from '../components/ui/Button'
import { submitTool } from '../lib/api'
import { ApiError } from '../lib/rest'
import type { RouteHandle } from '../lib/seo'
import { useFormTimer } from '../lib/useFormTimer'

export const handle: RouteHandle = {
  meta: () => ({
    title: 'Предложи AI алатка',
    description: 'Знаеш корисна AI алатка што ја нема во каталогот? Предложи ја — уредниците ја проверуваат пред објавување.',
    path: '/predlozi',
  }),
}

type Errors = Partial<Record<'name' | 'url' | 'explanation' | 'email', string>>

function validate(values: { name: string; url: string; explanation: string; email: string }): Errors {
  const errors: Errors = {}
  if (values.name.trim().length < 2 || values.name.trim().length > 120) errors.name = 'Внеси име од 2 до 120 знаци.'
  try {
    const url = new URL(values.url.trim())
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error()
  } catch {
    errors.url = 'Внеси целосна адреса, на пр. https://primer.com'
  }
  if (values.explanation.length > 2000) errors.explanation = 'Најмногу 2000 знаци.'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) errors.email = 'Е-поштата не е валидна.'
  return errors
}

export function Component() {
  const [values, setValues] = useState({ name: '', url: '', explanation: '', email: '' })
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<{ state: 'idle' | 'sending' | 'done' | 'error'; message?: string; slug?: string; kind?: string }>({ state: 'idle' })
  const elapsed = useFormTimer()

  const update = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }))

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      const first = event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    setStatus({ state: 'sending' })
    try {
      const result = await submitTool({ ...values, website, elapsedMs: elapsed() })
      if (!result.ok) {
        setStatus({ state: 'error', message: result.message })
        return
      }
      setStatus({ state: 'done', kind: result.status, slug: result.slug })
      setValues({ name: '', url: '', explanation: '', email: '' })
    } catch (error) {
      setStatus({ state: 'error', message: error instanceof ApiError ? error.message : 'Испраќањето не успеа. Обиди се повторно.' })
    }
  }

  return (
    <StaticPage
      label="Заедница"
      title="Предложи алатка"
      intro="Ни недостасува корисна алатка? Испрати ни ја. Секој предлог го прегледува уредник — ништо не се објавува автоматски."
      aside={
        <div className="border border-ink bg-white p-5 text-sm">
          <p className="label-mono mb-2 text-graphite">Што се случува потоа</p>
          <ol className="list-decimal space-y-2 pl-4">
            <li>Предлогот влегува во редот за модерација.</li>
            <li>Уредник ја проверува официјалната страница, условите и цените.</li>
            <li>Ако алатката е корисна и достапна, ја додаваме со проверени податоци.</li>
          </ol>
        </div>
      }
    >
      {status.state === 'done' ? (
        <FormMessage tone="success">
          {status.kind === 'exists' && status.slug ? (
            <p>
              Оваа алатка веќе е во каталогот:{' '}
              <Link to={`/alatka/${status.slug}`} className="underline">
                отвори го профилот
              </Link>
              .
            </p>
          ) : status.kind === 'duplicate' ? (
            <p>Благодариме! Некој веќе ја предложи истата алатка и таа чека преглед.</p>
          ) : (
            <p>Благодариме! Предлогот е примен и чека преглед од уредник.</p>
          )}
          <button type="button" className="mt-2 underline" onClick={() => setStatus({ state: 'idle' })}>
            Предложи друга алатка
          </button>
        </FormMessage>
      ) : (
        <form onSubmit={onSubmit} noValidate className="relative not-prose max-w-xl space-y-5">
          <Honeypot value={website} onChange={setWebsite} />
          <Field label="Име на алатката" required error={errors.name}>
            {(props) => <input {...props} type="text" maxLength={120} value={values.name} onChange={(e) => update('name')(e.target.value)} className={inputClasses} />}
          </Field>
          <Field label="Официјална веб-страница" required error={errors.url} hint="Целосна адреса, на пр. https://primer.com">
            {(props) => (
              <input {...props} type="url" inputMode="url" maxLength={300} value={values.url} onChange={(e) => update('url')(e.target.value)} className={inputClasses} />
            )}
          </Field>
          <Field label="Зошто е корисна?" error={errors.explanation} hint="За која задача ја користиш и што ти се допаѓа.">
            {(props) => (
              <textarea {...props} rows={5} maxLength={2000} value={values.explanation} onChange={(e) => update('explanation')(e.target.value)} className={inputClasses} />
            )}
          </Field>
          <Field label="Е-пошта за повратна информација" error={errors.email} hint="Ја користиме само ако имаме прашање за предлогот.">
            {(props) => (
              <input {...props} type="email" autoComplete="email" value={values.email} onChange={(e) => update('email')(e.target.value)} className={inputClasses} />
            )}
          </Field>
          {status.state === 'error' && status.message ? <FormMessage tone="error">{status.message}</FormMessage> : null}
          <p className="text-xs text-graphite">
            Со испраќање се согласуваш податоците да ги обработиме за преглед на предлогот, според{' '}
            <Link to="/privatnost" className="underline">
              политиката за приватност
            </Link>
            .
          </p>
          <Button type="submit" size="lg" disabled={status.state === 'sending'}>
            {status.state === 'sending' ? 'Се испраќа…' : 'Испрати предлог'}
          </Button>
        </form>
      )}
    </StaticPage>
  )
}
