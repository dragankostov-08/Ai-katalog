import { useState, type FormEvent } from 'react'
import { Link, useRouteLoaderData, useSearchParams } from 'react-router'
import { Field, FormMessage, Honeypot, inputClasses } from '../components/forms/Field'
import { OwnerValue, StaticPage } from '../components/layout/StaticPage'
import { Button } from '../components/ui/Button'
import { sendContactMessage } from '../lib/api'
import { ApiError } from '../lib/rest'
import type { RouteHandle } from '../lib/seo'
import type { SiteData } from '../lib/types'
import { useFormTimer } from '../lib/useFormTimer'

export const handle: RouteHandle = {
  meta: () => ({
    title: 'Контакт',
    description: 'Контактирај го уредништвото на AI KATALOG: прашања, корекции на податоци, огласување и приватност.',
    path: '/kontakt',
  }),
}

const TOPICS = [
  { value: 'general', label: 'Општо прашање' },
  { value: 'correction', label: 'Корекција на податоци за алатка' },
  { value: 'advertising', label: 'Огласување' },
  { value: 'privacy', label: 'Приватност и лични податоци' },
]

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

export function Component() {
  const site = useRouteLoaderData('root') as SiteData
  const [searchParams] = useSearchParams()
  const initialTopic = TOPICS.some((t) => t.value === searchParams.get('tema')) ? (searchParams.get('tema') as string) : 'general'
  const [values, setValues] = useState({ name: '', email: '', topic: initialTopic, message: '' })
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<{ state: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ state: 'idle' })
  const elapsed = useFormTimer()
  const email = site.settings.contact_email

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: Errors = {}
    if (values.name.trim().length < 2) found.name = 'Внеси име (најмалку 2 знаци).'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) found.email = 'Внеси валидна е-пошта за одговор.'
    if (values.message.trim().length < 10) found.message = 'Пораката треба да има најмалку 10 знаци.'
    setErrors(found)
    if (Object.keys(found).length) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setStatus({ state: 'sending' })
    try {
      const result = await sendContactMessage({ ...values, website, elapsedMs: elapsed() })
      if (!result.ok) {
        setStatus({ state: 'error', message: result.message })
        return
      }
      setStatus({ state: 'done' })
      setValues({ name: '', email: '', topic: 'general', message: '' })
    } catch (error) {
      setStatus({ state: 'error', message: error instanceof ApiError ? error.message : 'Испраќањето не успеа. Обиди се повторно.' })
    }
  }

  return (
    <StaticPage
      label="Уредништво"
      title="Контакт"
      intro="Прашања, корекции на податоци или соработка — пиши ни."
      aside={
        <div className="space-y-4 border border-ink bg-white p-5 text-sm">
          <div>
            <p className="label-mono mb-1 text-graphite">Е-пошта</p>
            {email ? (
              <a href={`mailto:${email}`} className="font-medium underline">
                {email}
              </a>
            ) : (
              <OwnerValue />
            )}
          </div>
          {site.settings.publisher_name ? (
            <div>
              <p className="label-mono mb-1 text-graphite">Издавач</p>
              <p>{site.settings.publisher_name}</p>
              {site.settings.publisher_address ? <p className="text-graphite">{site.settings.publisher_address}</p> : null}
            </div>
          ) : null}
          <p className="text-graphite">
            Ако пријавуваш грешка во податоците за некоја алатка, наведи ја алатката и изворот. Ги проверуваме сите корекции.
          </p>
        </div>
      }
    >
      {status.state === 'done' ? (
        <FormMessage tone="success">
          <p>Пораката е испратена. Ќе одговориме на наведената е-пошта.</p>
          <button type="button" className="mt-2 underline" onClick={() => setStatus({ state: 'idle' })}>
            Испрати нова порака
          </button>
        </FormMessage>
      ) : (
        <form onSubmit={onSubmit} noValidate className="relative not-prose max-w-xl space-y-5">
          <Honeypot value={website} onChange={setWebsite} />
          <Field label="Име" required error={errors.name}>
            {(props) => (
              <input {...props} type="text" autoComplete="name" maxLength={120} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className={inputClasses} />
            )}
          </Field>
          <Field label="Е-пошта" required error={errors.email}>
            {(props) => (
              <input {...props} type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} className={inputClasses} />
            )}
          </Field>
          <Field label="Тема" required>
            {(props) => (
              <select {...props} value={values.topic} onChange={(e) => setValues({ ...values, topic: e.target.value })} className={inputClasses}>
                {TOPICS.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Порака" required error={errors.message}>
            {(props) => (
              <textarea {...props} rows={6} maxLength={4000} value={values.message} onChange={(e) => setValues({ ...values, message: e.target.value })} className={inputClasses} />
            )}
          </Field>
          {status.state === 'error' && status.message ? <FormMessage tone="error">{status.message}</FormMessage> : null}
          <p className="text-xs text-graphite">
            Податоците ги користиме само за одговор на пораката. Повеќе во{' '}
            <Link to="/privatnost" className="underline">
              политиката за приватност
            </Link>
            .
          </p>
          <Button type="submit" size="lg" disabled={status.state === 'sending'}>
            {status.state === 'sending' ? 'Се испраќа…' : 'Испрати порака'}
          </Button>
        </form>
      )}
    </StaticPage>
  )
}
