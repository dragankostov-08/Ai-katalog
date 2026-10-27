import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { accentClasses, plural } from '../../lib/labels'
import type { CategorySummary } from '../../lib/types'
import { CategoryIcon } from './CategoryIcon'

/** Categories as entries of a printed index. Empty categories are listed but not linked. */
export function CategoryIndex({ categories, columns = 2 }: { categories: CategorySummary[]; columns?: 1 | 2 }) {
  return (
    <ol className={`grid gap-x-10 ${columns === 2 ? 'md:grid-cols-2' : ''}`}>
      {categories.map((category, index) => {
        const content = (
          <>
            <span className="pt-1 font-mono text-xs text-graphite">{String(index + 1).padStart(2, '0')}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center ${category.tool_count ? 'bg-ink text-paper' : 'border border-ink/30 text-graphite'}`}
                >
                  <span className={`absolute -top-1 -right-1 h-2 w-2 ${accentClasses[category.accent ?? 'ink']}`} />
                  <CategoryIcon name={category.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="font-display text-lg leading-tight font-bold md:text-xl">{category.name}</span>
              </span>
              <span className="mt-1 block text-sm leading-snug text-graphite">{category.description}</span>
            </span>
            <span className="flex items-center gap-1.5 pt-1 font-mono text-xs whitespace-nowrap">
              {category.tool_count ? (
                <>
                  {category.tool_count} {plural(category.tool_count, 'алатка', 'алатки')}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </>
              ) : (
                <span className="text-graphite">Во подготовка</span>
              )}
            </span>
          </>
        )
        const rowClass = 'grid grid-cols-[1.75rem_1fr_auto] items-start gap-3 py-4'
        return (
          <li key={category.slug} className="border-b border-ink/20">
            {category.tool_count ? (
              <Link to={`/kategorii/${category.slug}`} className={`group ${rowClass} transition-colors hover:bg-white/70`}>
                {content}
              </Link>
            ) : (
              <div className={`${rowClass} opacity-70`}>{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
