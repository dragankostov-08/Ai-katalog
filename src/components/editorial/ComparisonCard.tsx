import { Fragment } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import type { ComparisonCard as ComparisonCardData } from '../../lib/types'

export function ComparisonCard({ comparison }: { comparison: ComparisonCardData }) {
  return (
    <article className="group relative flex h-full flex-col border border-ink bg-white p-5 transition-shadow duration-200 hover:shadow-offset">
      <p className="label-mono text-graphite">Споредба · {comparison.tools.length} алатки</p>
      <p className="mt-4 font-display text-2xl leading-[1.05] font-extrabold tracking-tight" aria-hidden>
        {comparison.tools.map((tool, index) => (
          <Fragment key={tool.slug}>
            {index > 0 ? <span className="mx-1.5 font-serif text-xl font-normal text-tomato-ink italic">vs</span> : null}
            <span className="whitespace-nowrap">{tool.name}</span>
          </Fragment>
        ))}
      </p>
      <h3 className="mt-4 border-t border-ink/20 pt-3 font-medium leading-snug">
        <Link to={`/sporedbi/${comparison.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:underline-offset-4">
          {comparison.title}
        </Link>
      </h3>
      <p className="mt-auto pt-3 font-mono text-xs text-graphite">Ажурирано {formatDate(comparison.updated_at)}</p>
    </article>
  )
}
