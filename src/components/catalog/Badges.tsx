import { BadgeCheck, CircleDashed, RefreshCw } from 'lucide-react'
import { formatPrice, formatShortDate } from '../../lib/format'
import { pricingLabels, verificationLabels } from '../../lib/labels'
import type { ToolCard, VerificationStatus } from '../../lib/types'

/**
 * Pricing is only shown as a fact once an editor has verified it; otherwise
 * the badge says so explicitly.
 */
export function PricingBadge({ tool }: { tool: Pick<ToolCard, 'pricing_type' | 'verification_status' | 'starting_price' | 'currency' | 'price_period'> }) {
  if (tool.verification_status !== 'verified' || tool.pricing_type === 'unknown') {
    return <span className="font-mono text-[0.6875rem] tracking-wide text-graphite uppercase">Цена: непроверена</span>
  }
  const price = formatPrice(tool.starting_price, tool.currency, tool.price_period)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 font-mono text-[0.6875rem] tracking-wide uppercase">
      <span className="rounded-xs border border-ink bg-paper px-1.5 py-0.5 font-medium">{pricingLabels[tool.pricing_type]}</span>
      {price && tool.pricing_type !== 'free' ? <span className="text-graphite normal-case">од {price}</span> : null}
    </span>
  )
}

export function VerificationBadge({ status, date, compact }: { status: VerificationStatus; date?: string | null; compact?: boolean }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-teal-ink">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        {compact ? verificationLabels.verified : `Проверено${date ? ` ${formatShortDate(date)}` : ''}`}
      </span>
    )
  }
  const Icon = status === 'needs_update' ? RefreshCw : CircleDashed
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-graphite">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {verificationLabels[status]}
    </span>
  )
}
