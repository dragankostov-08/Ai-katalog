import type { ReactNode } from 'react'

export function MetaLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-xs font-medium text-graphite ${className}`}>{children}</span>
}

const tones = {
  paper: 'bg-cream text-graphite',
  ink: 'bg-ink text-white',
  cream: 'bg-cream text-graphite',
  brand: 'bg-brand-soft text-tomato-ink',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
}

/** Small rounded pill for categories, statuses and tags. */
export function Tag({ children, className = '', tone = 'paper' }: { children: ReactNode; className?: string; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>
}

/** Clearly labels paid placements. Never omitted when a placement is sponsored. */
export function SponsoredTag({ className = '' }: { className?: string }) {
  return <span className={`inline-flex items-center rounded-full bg-raspberry/10 px-2 py-0.5 text-xs font-semibold text-raspberry ${className}`}>Спонзорирано</span>
}

export function IndexNumber({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`text-xs font-semibold text-mid ${className}`}>#{value}</span>
}
