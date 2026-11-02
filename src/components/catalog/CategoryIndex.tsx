import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { plural } from '../../lib/labels'
import type { Accent, CategorySummary, ToolCard } from '../../lib/types'
import { PricingBadge } from './Badges'
import { CategoryIcon } from './CategoryIcon'
import { ToolLogo } from './ToolLogo'

export const accentTiles: Record<Accent, string> = {
  tomato: 'bg-brand-soft text-tomato-ink',
  mustard: 'bg-warn-soft text-warn',
  teal: 'bg-success-soft text-success',
  raspberry: 'bg-raspberry/10 text-raspberry',
  ink: 'bg-info-soft text-info',
}

/** Category cards. Empty categories are listed but not linked. */
export function CategoryIndex({ categories }: { categories: CategorySummary[]; columns?: 1 | 2 }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const content = (
          <>
            <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentTiles[category.accent ?? 'ink']}`}>
              <CategoryIcon name={category.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{category.name}</span>
                <span className="shrink-0 text-xs font-medium text-mid">
                  {category.tool_count ? `${category.tool_count} ${plural(category.tool_count, 'алатка', 'алатки')}` : 'Наскоро'}
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-graphite">{category.description}</span>
            </span>
          </>
        )
        const card = 'flex items-start gap-3 rounded-2xl border border-light bg-surface p-4'
        return (
          <li key={category.slug}>
            {category.tool_count ? (
              <Link to={`/kategorii/${category.slug}`} className={`${card} shadow-sm transition-[border-color,box-shadow] hover:border-white/20 hover:shadow-offset-sm`}>
                {content}
              </Link>
            ) : (
              <div className={`${card} opacity-60`}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export interface CategoryWithTools {
  slug: string
  name: string
  icon: string | null
  accent: Accent | null
  description: string
  tool_count: number
  tools: ToolCard[]
}

/** Directory-style box: a category with its top tools listed inside. */
export function CategoryBox({ category }: { category: CategoryWithTools }) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-light bg-surface p-4 shadow-sm" aria-labelledby={`box-${category.slug}`}>
      <div className="mb-2 flex items-center gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentTiles[category.accent ?? 'ink']}`}>
          <CategoryIcon name={category.icon} className="h-4.5 w-4.5" />
        </span>
        <h3 id={`box-${category.slug}`} className="min-w-0 flex-1 truncate font-bold">
          <Link to={`/kategorii/${category.slug}`} className="hover:text-tomato-ink">
            {category.name}
          </Link>
        </h3>
        <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-graphite">{category.tool_count}</span>
      </div>
      <ol className="flex-1">
        {category.tools.map((tool, index) => (
          <li key={tool.id} className="group relative flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-cream">
            <span className="w-4 text-right text-xs font-semibold text-mid">{index + 1}</span>
            <ToolLogo name={tool.name} src={tool.logo_url} size="sm" />
            <Link to={`/alatka/${tool.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
              {tool.name}
            </Link>
            <span className="hidden shrink-0 sm:block">
              <PricingBadge tool={tool} />
            </span>
          </li>
        ))}
      </ol>
      <Link to={`/kategorii/${category.slug}`} className="mt-2 inline-flex items-center gap-1 self-start rounded-full px-1.5 text-sm font-semibold text-tomato-ink hover:text-tomato">
        Види ги сите {category.tool_count}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  )
}
