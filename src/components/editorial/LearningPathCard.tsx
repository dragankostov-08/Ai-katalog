import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router'
import { skillLabels } from '../../lib/labels'
import type { LearningPathCard as PathCardData } from '../../lib/types'

export function LearningPathCard({ path }: { path: PathCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl brand-gradient p-5 text-white shadow-sm">
      <GraduationCap className="absolute -right-4 -bottom-6 h-32 w-32 text-white/15" strokeWidth={1.2} aria-hidden />
      <p className="relative text-xs font-semibold text-white/80">
        Патека{path.level ? ` · ${skillLabels[path.level]}` : ''}
        {path.estimated_days ? ` · ${path.estimated_days} дена` : ''}
      </p>
      <h3 className="relative mt-2 text-xl leading-tight font-extrabold">
        <Link to={`/patki/${path.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-4">
          {path.title}
        </Link>
      </h3>
      <p className="relative mt-2 line-clamp-3 text-sm text-white/85">{path.summary}</p>
      <p className="relative mt-auto pt-4 text-xs font-medium text-white/80">
        {path.step_count} чекори{path.total_minutes ? ` · околу ${path.total_minutes} мин.` : ''}
      </p>
    </article>
  )
}
