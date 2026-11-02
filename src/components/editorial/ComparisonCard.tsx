import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import type { ComparisonCard as ComparisonCardData } from '../../lib/types'
import { ToolLogo } from '../catalog/ToolLogo'

export function ComparisonCard({ comparison }: { comparison: ComparisonCardData }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-light bg-white p-4 shadow-sm transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-offset-sm">
      <div className="flex items-center">
        {comparison.tools.slice(0, 4).map((tool, index) => (
          <span key={tool.slug} className={`rounded-xl ring-2 ring-white ${index ? '-ml-2' : ''}`}>
            <ToolLogo name={tool.name} src={tool.logo_url} size="sm" />
          </span>
        ))}
        <span className="ml-3 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-tomato-ink">VS</span>
      </div>
      <h3 className="mt-3 font-bold leading-snug">
        <Link to={`/sporedbi/${comparison.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
          {comparison.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-graphite">{comparison.tools.map((tool) => tool.name).join(' · ')}</p>
      <p className="mt-auto pt-3 text-xs text-mid">Ажурирано {formatDate(comparison.updated_at)}</p>
    </article>
  )
}
