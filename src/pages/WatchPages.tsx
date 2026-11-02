import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FormMessage } from '../components/forms/Field'
import { StaticPage } from '../components/layout/StaticPage'
import { Button } from '../components/ui/Button'
import { confirmWatch, unwatchTool } from '../lib/api'
import type { RouteHandle } from '../lib/seo'

const VALID = (id: string, token: string) => /^[0-9a-f-]{36}$/.test(id) && /^[a-f0-9]{64}$/.test(token)

/** Confirmation requires a click so that link scanners cannot confirm on their own. */
function WatchAction({ kind }: { kind: 'confirm' | 'unsubscribe' }) {
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const token = params.get('token') ?? ''
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string; tool?: { name?: string; slug?: string } }>({ status: 'idle' })

  async function run() {
    setState({ status: 'sending' })
    try {
      const result: { ok: boolean; message?: string; tool_name?: string; tool_slug?: string } =
        kind === 'confirm' ? await confirmWatch(id, token) : await unwatchTool(id, token)
      if (!result.ok) return setState({ status: 'error', message: result.message })
      setState({ status: 'done', tool: { name: result.tool_name, slug: result.tool_slug } })
    } catch {
      setState({ status: 'error', message: 'Барањето не успеа. Обиди се повторно.' })
    }
  }

  if (!VALID(id, token)) return <FormMessage tone="error">Линкот не е целосен. Отвори го линкот од е-поштата.</FormMessage>
  if (state.status === 'done') {
    return (
      <FormMessage tone="success">
        {kind === 'confirm' ? (
          <>
            Потврдено. Ќе добиеш е-пошта кога уредништвото ќе потврди промена на цената или планот
            {state.tool?.slug ? (
              <>
                {' '}
                на <Link to={`/alatka/${state.tool.slug}`} className="underline">{state.tool.name}</Link>
              </>
            ) : null}
            .
          </>
        ) : (
          'Одјавен/а си. Нема повеќе да добиваш известувања за оваа алатка.'
        )}
      </FormMessage>
    )
  }
  return (
    <div className="not-prose space-y-4">
      <p>{kind === 'confirm' ? 'Потврди дека сакаш известувања за промени на цената на оваа алатка.' : 'Потврди дека сакаш да престанеш да ги следиш промените.'}</p>
      {state.status === 'error' && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <Button onClick={run} disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Се праќа…' : kind === 'confirm' ? 'Потврди' : 'Одјави ме'}
      </Button>
    </div>
  )
}

export const watchConfirmRoute = {
  handle: { meta: () => ({ title: 'Потврди следење', noindex: true }) } satisfies RouteHandle,
  Component() {
    return (
      <StaticPage label="Известувања" title="Потврди следење">
        <WatchAction kind="confirm" />
      </StaticPage>
    )
  },
}

export const watchUnsubscribeRoute = {
  handle: { meta: () => ({ title: 'Одјава од известувања', noindex: true }) } satisfies RouteHandle,
  Component() {
    return (
      <StaticPage label="Известувања" title="Одјава од известувања">
        <WatchAction kind="unsubscribe" />
      </StaticPage>
    )
  },
}
