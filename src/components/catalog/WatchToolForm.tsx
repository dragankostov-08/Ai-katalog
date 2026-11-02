import { BellRing } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { watchTool } from '../../lib/api'
import { env } from '../../lib/env'
import { ApiError } from '../../lib/rest'
import { FormMessage, Honeypot, inputClasses } from '../forms/Field'
import { Button } from '../ui/Button'

/** Double opt-in e-mail alert when an editor verifies a price or plan change. */
export function WatchToolForm({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ status: 'idle' })

  if (!env.featureAlerts) return null

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setState({ status: 'error', message: 'Внеси валидна е-пошта.' })
    if (!consent) return setState({ status: 'error', message: 'Потребна е твоја согласност.' })
    setState({ status: 'sending' })
    try {
      const result = await watchTool(slug, email.trim(), consent, website)
      setState(result.ok ? { status: 'done' } : { status: 'error', message: result.message })
    } catch (error) {
      setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Барањето не успеа. Обиди се повторно.' })
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 hover:text-tomato-ink">
        <BellRing className="h-4 w-4" aria-hidden /> Извести ме кога ќе се смени цената
      </button>
    )
  }

  if (state.status === 'done') {
    return (
      <FormMessage tone="success">
        Провери ја е-поштата и потврди го следењето. Ако адресата веќе следи {name}, нема промена.
      </FormMessage>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-2 border border-ink/25 bg-paper p-3">
      <Honeypot value={website} onChange={setWebsite} />
      <label htmlFor="watch-email" className="block text-sm font-medium">
        Е-пошта за известување
      </label>
      <input id="watch-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
      <label className="flex items-start gap-2 text-xs text-graphite">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-tomato" />
        <span>
          Сакам е-пошта кога уредништвото ќе потврди промена на цената или планот на {name}. Одјава со еден клик.{' '}
          <Link to="/privatnost" className="underline">
            Приватност
          </Link>
        </span>
      </label>
      {state.status === 'error' && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <Button type="submit" size="sm" className="w-full" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Се праќа…' : 'Следи ги промените'}
      </Button>
    </form>
  )
}
