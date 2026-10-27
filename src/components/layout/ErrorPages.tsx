import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ButtonLink } from '../ui/Button'
import { Skeleton } from '../ui/States'

export function NotFoundContent() {
  return (
    <div className="container-page py-16 md:py-24">
      <p className="label-mono text-tomato-ink">Грешка 404</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] font-black tracking-[-0.03em] md:text-7xl">
        Оваа страница ја нема во каталогот.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-graphite">
        Можеби адресата е погрешно напишана, или содржината е преместена или архивирана.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/alatki">Пребарај алатки</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          Почетна страница
        </ButtonLink>
      </div>
    </div>
  )
}

export function ServerErrorContent({ message }: { message?: string }) {
  return (
    <div className="container-page py-16 md:py-24">
      <p className="label-mono text-tomato-ink">Привремена грешка</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">
        Страницата моментално не може да се вчита.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-graphite">
        Проблемот најверојатно е привремен. Обиди се повторно за неколку моменти.
      </p>
      {message ? <p className="mt-3 max-w-xl font-mono text-xs text-graphite">{message}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center rounded-sm bg-ink px-4 font-medium text-paper"
        >
          Обиди се повторно
        </button>
        <ButtonLink to="/" variant="secondary">
          Почетна страница
        </ButtonLink>
      </div>
    </div>
  )
}

/** Error boundary rendered inside the site layout. */
export function PageErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundContent />
  const message = error instanceof Error && import.meta.env.DEV ? error.message : undefined
  return <ServerErrorContent message={message} />
}

/** Last-resort boundary when the layout itself fails. */
export function RootErrorBoundary() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="border-b border-ink">
        <div className="container-page flex h-16 items-center">
          <a href="/" className="font-display text-xl font-black">
            AI KATALOG
          </a>
        </div>
      </div>
      <ServerErrorContent />
    </div>
  )
}

/** Shown while the first route data loads in a non-pre-rendered page. */
export function HydrateFallback() {
  return (
    <div className="min-h-dvh bg-paper" aria-busy="true" aria-live="polite">
      <div className="border-b border-ink">
        <div className="container-page flex h-16 items-center gap-3">
          <span className="font-display text-xl font-black">AI KATALOG</span>
        </div>
      </div>
      <div className="container-page py-12">
        <span className="sr-only">Се вчитува…</span>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-3/4" />
        <Skeleton className="mt-3 h-12 w-1/2" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  )
}
