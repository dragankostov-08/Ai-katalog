import { MessageSquareText } from 'lucide-react'
import { Link } from 'react-router'
import type { PromptCard as PromptCardData } from '../../lib/types'

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-light bg-white p-4 shadow-sm transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-offset-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-tomato-ink">
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
          {prompt.use_case?.name ?? 'Промпт'}
        </span>
        {prompt.is_featured ? <span className="text-[0.625rem] font-bold text-mid">ИЗБОР</span> : null}
      </div>
      <h3 className="mt-3 font-bold leading-snug">
        <Link to={`/promptovi/${prompt.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
          {prompt.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-graphite">{prompt.summary}</p>
      <p className="mt-3 line-clamp-3 rounded-lg bg-paper px-3 py-2 font-code text-xs leading-relaxed text-charcoal">{prompt.preview}</p>
      {prompt.tools.length ? <p className="mt-auto pt-3 text-xs text-mid">Работи со: {prompt.tools.map((t) => t.name).join(', ')}</p> : null}
    </article>
  )
}
