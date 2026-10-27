import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { trackOutbound, type OutboundContext } from '../../lib/analytics'
import { buttonClasses } from '../ui/Button'

export function outboundUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', 'ai-katalog')
      parsed.searchParams.set('utm_medium', 'referral')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

interface OfficialLinkProps {
  url: string
  slug: string
  context: OutboundContext
  sponsored?: boolean
  children?: ReactNode
  variant?: 'button' | 'text'
  className?: string
}

/** Outbound link to a tool's official website, counted in aggregate only. */
export function OfficialLink({ url, slug, context, sponsored, children, variant = 'button', className = '' }: OfficialLinkProps) {
  const classes =
    variant === 'button'
      ? buttonClasses('primary', 'lg', className)
      : `inline-flex items-center gap-1 font-medium underline decoration-tomato decoration-2 underline-offset-4 hover:bg-cream ${className}`
  return (
    <a
      href={outboundUrl(url)}
      target="_blank"
      rel={sponsored ? 'sponsored noopener' : 'noopener'}
      className={classes}
      onClick={() => trackOutbound(slug, context)}
    >
      {children ?? 'Официјална страница'}
      <ArrowUpRight className="h-4 w-4" aria-hidden />
      <span className="sr-only">(се отвора во нов прозорец)</span>
    </a>
  )
}
