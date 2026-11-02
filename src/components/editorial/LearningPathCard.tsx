import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router'
import { skillLabels } from '../../lib/labels'
import type { LearningPathCard as PathCardData } from '../../lib/types'

export function LearningPathCard({ path }: { path: PathCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-light bg-surface p-5 text-ink transition-colors hover:border-white/20">
      <GraduationCap className="absolute -right-4 -bottom-6 h-32 w-32 text-white/[0.06]" strokeWidth={1} aria-hidden />
      <p className="relative text-xs font-medium text-tomato-ink">
        Патека{path.level ? ` · ${skillLabels[path.level]}` : ''}
        {path.estimated_days ? ` · ${path.estimated_days} дена` : ''}
      </p>
      <h3 className="relative mt-2 text-xl leading-tight font-semibold">
        <Link to={`/patki/${path.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-4">
          {path.title}
        </Link>
      </h3>
      <p className="relative mt-2 line-clamp-3 text-sm text-graphite">{path.summary}</p>
      <p className="relative mt-auto pt-4 text-xs font-medium text-mid">
        {path.step_count} чекори{path.total_minutes ? ` · околу ${path.total_minutes} мин.` : ''}
      </p>
    </article>
  )
}
