import { useEffect, useState } from 'react'
import { ToolGrid } from '../components/catalog/ToolGrid'
import { Button, ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState, ErrorState, ToolCardSkeleton } from '../components/ui/States'
import { fetchToolsBySlugs } from '../lib/api'
import { clearFavorites, useFavorites } from '../lib/favorites'
import type { RouteHandle } from '../lib/seo'
import type { ToolCard } from '../lib/types'

export const handle: RouteHandle = {
  meta: () => ({ title: 'Омилени алатки', description: 'Алатките што ги зачува во овој прелистувач.', path: '/omileni', noindex: true }),
}

export function Component() {
  const favorites = useFavorites()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; tools: ToolCard[] }>({ status: 'loading', tools: [] })
  const [mounted, setMounted] = useState(false)
  const key = favorites.join(',')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const slugs = key ? key.split(',') : []
    if (!slugs.length) {
      setState({ status: 'ready', tools: [] })
      return
    }
    const controller = new AbortController()
    setState((current) => ({ ...current, status: current.tools.length ? 'ready' : 'loading' }))
    fetchToolsBySlugs(slugs, controller.signal)
      .then((tools) => setState({ status: 'ready', tools }))
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setState({ status: 'error', tools: [] })
      })
    return () => controller.abort()
  }, [key, mounted])

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Омилени' }]} />
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-6">
        <div className="max-w-2xl">
          <p className="label-mono text-tomato-ink">Само во овој прелистувач</p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Омилени алатки</h1>
          <p className="mt-3 text-graphite">Зачуваните алатки се чуваат локално — без регистрација и без да ни ги праќаш.</p>
        </div>
        {favorites.length ? (
          <Button variant="secondary" onClick={() => clearFavorites()}>
            Исчисти листа
          </Button>
        ) : null}
      </header>
      {!mounted || state.status === 'loading' ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <ToolCardSkeleton />
            </li>
          ))}
        </ul>
      ) : state.status === 'error' ? (
        <ErrorState>Омилените алатки не може да се вчитаат во моментов.</ErrorState>
      ) : state.tools.length ? (
        <ToolGrid tools={state.tools} />
      ) : (
        <EmptyState title="Сè уште немаш зачувано алатки" action={<ButtonLink to="/alatki">Разгледај го каталогот</ButtonLink>}>
          Кликни на иконата за обележувач на која било алатка за да ја зачуваш тука.
        </EmptyState>
      )}
    </div>
  )
}
