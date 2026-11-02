import { ArrowUpRight, Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDate, formatRelative } from '../../lib/format'
import type { NewsItem } from '../../lib/types'

/** Relative times change after the build; render dates first, then relative on the client. */
function When({ value }: { value: string | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!value) return null
  return <time dateTime={value}>{mounted ? formatRelative(value) : formatDate(value)}</time>
}

export function NewsRow({ item, compact = false }: { item: NewsItem; compact?: boolean }) {
  return (
    <li className="group relative rounded-xl px-3 py-3 transition-colors hover:bg-paper">
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-graphite">
        <span className="font-semibold text-tomato-ink">{item.source.name}</span>
        <span aria-hidden>·</span>
        <When value={item.published_at} />
      </p>
      <h3 className={`mt-1 leading-snug font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
        <a href={item.url} target="_blank" rel="noopener" className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
          {item.title}
          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 text-mid" aria-hidden />
          <span className="sr-only">(отвора {item.source.name} во нов прозорец)</span>
        </a>
      </h3>
      {!compact && item.summary ? <p className="mt-1 line-clamp-2 text-sm text-graphite">{item.summary}</p> : null}
    </li>
  )
}

export function NewsWidget({ items }: { items: NewsItem[] }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-light bg-white p-3 shadow-sm" aria-labelledby="news-widget">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <h2 id="news-widget" className="inline-flex items-center gap-2 font-bold">
          <Newspaper className="h-4 w-4 text-tomato" aria-hidden /> AI вести
        </h2>
        <a href="/vesti" className="text-sm font-semibold text-tomato-ink hover:text-tomato">
          Сите →
        </a>
      </div>
      <ul className="divide-y divide-light/70">
        {items.map((item) => (
          <NewsRow key={item.id} item={item} compact />
        ))}
      </ul>
    </section>
  )
}
