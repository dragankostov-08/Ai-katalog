import { Columns3 } from 'lucide-react'
import { useState } from 'react'
import { MAX_COMPARE, toggleCompare, useCompare } from '../../lib/compare'

export function CompareButton({ slug, name, variant = 'small', className = '' }: { slug: string; name: string; variant?: 'small' | 'full'; className?: string }) {
  const selected = useCompare()
  const [full, setFull] = useState(false)
  const active = selected.some((item) => item.slug === slug)

  const onClick = () => {
    const ok = toggleCompare({ slug, name })
    setFull(!ok)
    if (!ok) setTimeout(() => setFull(false), 2500)
  }

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-light px-3 text-sm font-medium hover:bg-cream ${active ? 'bg-cream' : ''} ${className}`}
      >
        <Columns3 className="h-4 w-4" aria-hidden />
        {full ? `Најмногу ${MAX_COMPARE} алатки` : active ? 'Во споредба' : 'Спореди'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Отстрани ${name} од споредба` : `Додај ${name} во споредба`}
      className={`relative z-10 inline-flex items-center gap-1 font-mono text-[0.6875rem] tracking-wide uppercase hover:text-ink ${active ? 'text-ink' : 'text-graphite'} ${className}`}
    >
      <span aria-hidden className={`inline-flex h-3.5 w-3.5 items-center justify-center border ${active ? 'border-light bg-tomato text-paper' : 'border-light'}`}>
        {active ? '✓' : ''}
      </span>
      {full ? `Макс. ${MAX_COMPARE}` : 'Спореди'}
    </button>
  )
}
