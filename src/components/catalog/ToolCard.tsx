import * as m from 'motion/react-m'
import { Link } from 'react-router'
import { formatShortDate } from '../../lib/format'
import type { ToolCard as ToolCardData } from '../../lib/types'
import { SponsoredTag } from '../ui/Labels'
import { PricingBadge } from './Badges'
import { CompareButton } from './CompareButton'
import { FavoriteButton } from './FavoriteButton'
import { ToolLogo } from './ToolLogo'

export function CategoryMarker({ category }: { category: ToolCardData['category'] }) {
  if (!category) return null
  return <span className="inline-flex items-center rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-graphite">{category.name}</span>
}

export function ToolCard({ tool, headingLevel = 3 }: { tool: ToolCardData; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <m.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative flex h-full flex-col rounded-2xl border border-light bg-surface p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-white/20 hover:shadow-offset focus-within:border-white/25"
    >
      <div className="flex items-start gap-3">
        <ToolLogo name={tool.name} src={tool.logo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Heading className="truncate text-base leading-tight font-bold">
              <Link to={`/alatka/${tool.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                {tool.name}
              </Link>
            </Heading>
            {tool.is_featured ? <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.625rem] font-bold text-tomato-ink">ИЗБОР</span> : null}
          </div>
          <div className="mt-1">
            <CategoryMarker category={tool.category} />
          </div>
        </div>
        <FavoriteButton slug={tool.slug} name={tool.name} className="-mt-1 -mr-1" />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-graphite">{tool.short_description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <PricingBadge tool={tool} />
        <span className="flex items-center gap-2">
          {tool.is_sponsored ? <SponsoredTag /> : null}
          <CompareButton slug={tool.slug} name={tool.name} />
        </span>
      </div>
    </m.article>
  )
}

/** Dense row used for "latest" lists. */
export function ToolRow({ tool, showDate = true }: { tool: ToolCardData; showDate?: boolean }) {
  return (
    <li className="group relative flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-cream">
      <ToolLogo name={tool.name} src={tool.logo_url} size="sm" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">
          <Link to={`/alatka/${tool.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
            {tool.name}
          </Link>
        </h3>
        <p className="truncate text-xs text-graphite">{tool.short_description}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <PricingBadge tool={tool} />
        {showDate && tool.published_at ? <span className="text-[0.6875rem] text-mid">{formatShortDate(tool.published_at)}</span> : null}
      </div>
    </li>
  )
}
