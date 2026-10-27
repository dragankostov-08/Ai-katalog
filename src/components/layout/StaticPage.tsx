import type { ReactNode } from 'react'
import { Breadcrumbs } from '../ui/Breadcrumbs'

export function StaticPage({ label, title, intro, children, aside }: { label: string; title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: title }]} />
      <header className="max-w-3xl border-b-2 border-ink pb-8">
        <p className="label-mono text-tomato-ink">{label}</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">{title}</h1>
        {intro ? <div className="mt-5 font-serif text-xl leading-relaxed text-graphite italic">{intro}</div> : null}
      </header>
      <div className={`mt-10 grid gap-12 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
        <div className="prose-ak">{children}</div>
        {aside ? <aside className="self-start">{aside}</aside> : null}
      </div>
    </div>
  )
}

/** Shows an owner-supplied value or states plainly that it has not been published yet. */
export function OwnerValue({ value, fallback = 'ќе биде објавено наскоро' }: { value?: string; fallback?: string }) {
  return value ? <>{value}</> : <span className="text-graphite italic">{fallback}</span>
}
