import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { FormMessage } from '../components/forms/Field'
import { StaticPage } from '../components/layout/StaticPage'
import { Button } from '../components/ui/Button'
import { unsubscribeNewsletter } from '../lib/api'
import type { RouteHandle } from '../lib/seo'

export const handle: RouteHandle = {
  meta: () => ({ title: 'Одјава од билтенот', noindex: true }),
}

export function Component() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<{ state: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ state: 'idle' })

  async function confirm() {
    setStatus({ state: 'sending' })
    try {
      const result = await unsubscribeNewsletter(token)
      setStatus(result.ok ? { state: 'done' } : { state: 'error', message: result.message })
    } catch {
      setStatus({ state: 'error', message: 'Одјавата не успеа. Обиди се повторно.' })
    }
  }

  return (
    <StaticPage label="Билтен" title="Одјава од билтенот">
      {status.state === 'done' ? (
        <FormMessage tone="success">Одјавен/а си. Нема повеќе да добиваш пораки од нас.</FormMessage>
      ) : !/^[a-f0-9]{64}$/.test(token) ? (
        <FormMessage tone="error">Линкот за одјава не е целосен. Користи го линкот од пораката или од потврдата за пријава.</FormMessage>
      ) : (
        <div className="not-prose space-y-4">
          <p>Потврди дека сакаш да се одјавиш од билтенот на AI KATALOG.</p>
          {status.state === 'error' && status.message ? <FormMessage tone="error">{status.message}</FormMessage> : null}
          <Button onClick={confirm} disabled={status.state === 'sending'}>
            {status.state === 'sending' ? 'Се одјавува…' : 'Потврди одјава'}
          </Button>
        </div>
      )}
    </StaticPage>
  )
}
