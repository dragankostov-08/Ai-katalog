import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { trackEvent } from '../../lib/analytics'
import { subscribeNewsletter } from '../../lib/api'
import { ApiError } from '../../lib/rest'
import { FormMessage, Honeypot, inputClasses } from '../forms/Field'
import { Button } from '../ui/Button'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function NewsletterSignup({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string; token?: string | null }>({ status: 'idle' })
  const emailRef = useRef<HTMLInputElement>(null)
  const dark = tone === 'dark'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setState({ status: 'error', message: 'Внеси валидна е-пошта.' })
      emailRef.current?.focus()
      return
    }
    if (!consent) {
      setState({ status: 'error', message: 'За пријава е потребна твоја согласност.' })
      return
    }
    setState({ status: 'sending' })
    try {
      const result = await subscribeNewsletter(email.trim(), consent, website)
      if (!result.ok) {
        setState({ status: 'error', message: result.message })
        return
      }
      trackEvent('newsletter_signup')
      setState({ status: 'done', token: result.token })
      setEmail('')
      setConsent(false)
    } catch (error) {
      setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Пријавата не успеа. Обиди се повторно.' })
    }
  }

  if (state.status === 'done') {
    return (
      <FormMessage tone="success">
        <p className="font-medium text-ink">Благодариме! Пријавата е примена.</p>
        {state.token ? (
          <p className="mt-1 text-graphite">
            Ако се предомислиш, можеш да се одјавиш преку{' '}
            <Link className="underline" to={`/newsletter/odjava?token=${state.token}`}>
              овој линк
            </Link>{' '}
            — зачувај го. Линк за одјава ќе има и во секоја порака.
          </p>
        ) : (
          <p className="mt-1 text-graphite">Ако адресата веќе беше пријавена, нема промена.</p>
        )}
      </FormMessage>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative">
      <Honeypot value={website} onChange={setWebsite} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Е-пошта
        </label>
        <input
          ref={emailRef}
          id="newsletter-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ime@primer.mk"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${inputClasses} sm:flex-1`}
        />
        <Button type="submit" variant={dark ? 'accent' : 'primary'} disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Се праќа…' : 'Пријави се'}
        </Button>
      </div>
      <label className={`mt-3 flex items-start gap-2.5 text-sm ${dark ? 'text-light' : 'text-graphite'}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-tomato"
        />
        <span>
          Се согласувам AI KATALOG да ми испраќа повремен билтен за нови алатки, споредби и водичи на оваа адреса. Можам да се одјавам во секое
          време. Детали во{' '}
          <Link to="/privatnost" className="underline underline-offset-2">
            политиката за приватност
          </Link>
          .
        </span>
      </label>
      {state.status === 'error' && state.message ? (
        <div className="mt-3">
          <FormMessage tone="error">{state.message}</FormMessage>
        </div>
      ) : null}
    </form>
  )
}
