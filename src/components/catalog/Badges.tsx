import { BadgeCheck, CircleDashed, RefreshCw } from 'lucide-react'
import { formatPrice, formatShortDate } from '../../lib/format'
import { pricingLabels, verificationLabels } from '../../lib/labels'
import type { PricingType, ToolCard, VerificationStatus } from '../../lib/types'

const pricingTones: Record<PricingType, string> = {
  free: 'bg-success-soft text-success',
  open_source: 'bg-success-soft text-success',
  freemium: 'bg-info-soft text-info',
  free_trial: 'bg-warn-soft text-warn',
  paid: 'bg-cream text-charcoal',
  unknown: 'bg-cream text-graphite',
}

/**
 * Pricing is only shown as a fact once an editor has verified it; otherwise
 * the pill says so explicitly.
 */
export function PricingBadge({ tool }: { tool: Pick<ToolCard, 'pricing_type' | 'verification_status' | 'starting_price' | 'currency' | 'price_period'> }) {
  if (tool.verification_status !== 'verified' || tool.pricing_type === 'unknown') {
    return <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-graphite">Цена: непроверена</span>
  }
  const price = formatPrice(tool.starting_price, tool.currency, tool.price_period)
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`rounded-full px-2 py-0.5 font-semibold ${pricingTones[tool.pricing_type]}`}>{pricingLabels[tool.pricing_type]}</span>
      {price && tool.pricing_type !== 'free' ? <span className="text-graphite">од {price}</span> : null}
    </span>
  )
}

export function VerificationBadge({ status, date, compact }: { status: VerificationStatus; date?: string | null; compact?: boolean }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-ink">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        {compact ? verificationLabels.verified : `Проверено${date ? ` ${formatShortDate(date)}` : ''}`}
      </span>
    )
  }
  const Icon = status === 'needs_update' ? RefreshCw : CircleDashed
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-graphite">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {verificationLabels[status]}
    </span>
  )
}
