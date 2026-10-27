import { Link } from 'react-router'
import { formatShortDate } from '../../lib/format'
import { accentClasses } from '../../lib/labels'
import type { ToolCard as ToolCardData } from '../../lib/types'
import { SponsoredTag } from '../ui/Labels'
import { PricingBadge } from './Badges'
import { FavoriteButton } from './FavoriteButton'
import { ToolLogo } from './ToolLogo'

export function CategoryMarker({ category }: { category: ToolCardData['category'] }) {
  if (!category) return null
  return (
    <span className="inline-flex items-center gap-1.5 label-mono text-graphite">
      <span aria-hidden className={`h-2 w-2 ${accentClasses[category.accent ?? 'ink']}`} />
      {category.name}
    </span>
  )
}

export function ToolCard({ tool, headingLevel = 3 }: { tool: ToolCardData; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="group relative flex h-full flex-col border border-ink/15 bg-white p-4 transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-editorial)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-offset focus-within:border-ink">
      {tool.is_featured ? (
        <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 bg-ink px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wider text-paper uppercase">
          <span aria-hidden className="h-1.5 w-1.5 bg-tomato" /> Избор
        </span>
      ) : null}
      <div className="flex items-start gap-3">
        <ToolLogo name={tool.name} src={tool.logo_url} />
        <div className="min-w-0 flex-1 pt-0.5">
          <Heading className="font-display text-lg leading-tight font-bold">
            <Link to={`/alatka/${tool.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {tool.name}
            </Link>
          </Heading>
          <div className="mt-1">
            <CategoryMarker category={tool.category} />
          </div>
        </div>
        <FavoriteButton slug={tool.slug} name={tool.name} className="-mt-1 -mr-1" />
      </div>
      <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-graphite">{tool.short_description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <PricingBadge tool={tool} />
        {tool.is_sponsored ? <SponsoredTag /> : null}
      </div>
    </article>
  )
}

/** Dense row used for "recently added" lists. */
export function ToolRow({ tool }: { tool: ToolCardData }) {
  return (
    <li className="group relative grid grid-cols-[auto_1fr] items-start gap-x-3 border-b border-ink/15 py-3">
      <ToolLogo name={tool.name} src={tool.logo_url} size="sm" />
      <div className="min-w-0">
        <h3 className="font-display leading-tight font-bold">
          <Link to={`/alatka/${tool.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
            {tool.name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-graphite">{tool.short_description}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CategoryMarker category={tool.category} />
          {tool.published_at ? <span className="font-mono text-[0.6875rem] text-graphite">{formatShortDate(tool.published_at)}</span> : null}
        </p>
      </div>
    </li>
  )
}
