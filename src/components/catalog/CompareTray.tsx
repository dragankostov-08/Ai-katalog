import { ArrowRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { clearCompare, compareHref, toggleCompare, useCompare } from '../../lib/compare'

/** Floating bar listing the tools picked for a side-by-side comparison. */
export function CompareTray() {
  const selected = useCompare()
  const location = useLocation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !selected.length || location.pathname === '/sporedi' || location.pathname.startsWith('/admin')) return null

  return (
    <aside
      aria-label="Споредба"
      className="fixed inset-x-3 bottom-3 z-40 glass flex flex-wrap items-center gap-2 border px-3 py-2 shadow-paper md:right-5 md:left-auto md:max-w-xl rounded-2xl"
    >
      <span className="label-mono text-graphite">Спореди:</span>
      {selected.map((item) => (
        <span key={item.slug} className="inline-flex items-center gap-1 rounded-xs border border-light bg-surface py-0.5 pr-1 pl-2 text-sm">
          {item.name}
          <button type="button" onClick={() => toggleCompare(item)} aria-label={`Отстрани ${item.name}`} className="p-0.5 hover:text-tomato-ink">
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <span className="ml-auto flex items-center gap-2">
        <button type="button" onClick={clearCompare} className="text-xs underline">
          Исчисти
        </button>
        {selected.length >= 2 ? (
          <Link to={compareHref(selected.map((item) => item.slug))} className="inline-flex h-8 items-center gap-1 rounded-sm bg-tomato px-3 text-sm font-medium text-paper">
            Спореди ({selected.length}) <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span className="text-xs text-graphite">Избери уште една</span>
        )}
      </span>
    </aside>
  )
}
