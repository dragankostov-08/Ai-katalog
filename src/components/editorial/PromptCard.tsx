import { Link } from 'react-router'
import type { PromptCard as PromptCardData } from '../../lib/types'

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  return (
    <article className="group relative flex h-full flex-col border border-ink/20 bg-white transition-[border-color,box-shadow] hover:border-ink hover:shadow-offset">
      <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-2">
        <span className="label-mono text-tomato-ink">{prompt.use_case?.name ?? 'Промпт'}</span>
        {prompt.is_featured ? <span className="font-mono text-[0.625rem] tracking-wider text-graphite uppercase">Избор</span> : null}
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
        <h3 className="font-display text-lg leading-snug font-bold">
          <Link to={`/promptovi/${prompt.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
            {prompt.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-sm text-graphite">{prompt.summary}</p>
        <p className="mt-3 line-clamp-3 border-l-2 border-mustard bg-paper px-3 py-2 font-mono text-xs leading-relaxed text-charcoal">{prompt.preview}</p>
        {prompt.tools.length ? (
          <p className="mt-auto pt-3 font-mono text-[0.6875rem] text-graphite">Работи со: {prompt.tools.map((t) => t.name).join(', ')}</p>
        ) : null}
      </div>
    </article>
  )
}
