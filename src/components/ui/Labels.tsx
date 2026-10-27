import type { ReactNode } from 'react'

export function MetaLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`label-mono text-graphite ${className}`}>{children}</span>
}

/** Small paper label with an ink border — category tags, status markers. */
export function Tag({ children, className = '', tone = 'paper' }: { children: ReactNode; className?: string; tone?: 'paper' | 'ink' | 'cream' }) {
  const tones = {
    paper: 'border-ink/25 bg-white text-ink',
    ink: 'border-ink bg-ink text-paper',
    cream: 'border-ink/20 bg-cream text-ink',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 tracking-wide uppercase ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

/** Clearly labels paid placements. Never omitted when a placement is sponsored. */
export function SponsoredTag({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-xs bg-raspberry px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 font-medium tracking-wide text-white uppercase ${className}`}>
      Спонзорирано
    </span>
  )
}

/** Index number in the editorial style: „№ 03“. */
export function IndexNumber({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`font-mono text-xs text-graphite ${className}`}>№&nbsp;{String(value).padStart(2, '0')}</span>
}
