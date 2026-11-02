import { Link } from 'react-router'
import { skillLabels } from '../../lib/labels'
import type { LearningPathCard as PathCardData } from '../../lib/types'

export function LearningPathCard({ path }: { path: PathCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-ink bg-ink p-5 text-paper">
      <span aria-hidden className="absolute -right-10 -bottom-12 h-44 w-44 rounded-full opacity-25 halftone-coarse invert" />
      <p className="relative label-mono text-mustard">
        Патека{path.level ? ` · ${skillLabels[path.level]}` : ''}
        {path.estimated_days ? ` · ${path.estimated_days} дена` : ''}
      </p>
      <h3 className="relative mt-3 font-display text-2xl leading-tight font-extrabold">
        <Link to={`/patki/${path.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
          {path.title}
        </Link>
      </h3>
      <p className="relative mt-2 text-sm text-light">{path.summary}</p>
      <p className="relative mt-auto pt-4 font-mono text-xs text-light">
        {path.step_count} чекори{path.total_minutes ? ` · околу ${path.total_minutes} мин.` : ''}
      </p>
    </article>
  )
}
