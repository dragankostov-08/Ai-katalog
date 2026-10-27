import { Link } from 'react-router'
import { plural } from '../../lib/labels'
import type { CollectionCard as CollectionCardData } from '../../lib/types'

export function CollectionCard({ collection, index }: { collection: CollectionCardData; index?: number }) {
  return (
    <article className="group relative h-full pt-3">
      <span aria-hidden className="absolute top-0 left-4 h-4 w-20 border border-b-0 border-ink/40 bg-cream" />
      <div className="relative flex h-full flex-col border border-ink/40 bg-white ruled px-5 pt-4 pb-5 shadow-paper transition-transform duration-300 group-hover:-rotate-[0.6deg]">
        <span aria-hidden className="absolute inset-y-0 left-9 w-px bg-tomato/50" />
        <div className="relative pl-7">
          <p className="label-mono text-graphite">
            Најдобри{index !== undefined ? ` · № ${String(index + 1).padStart(2, '0')}` : ''} · {collection.tool_count}{' '}
            {plural(collection.tool_count, 'алатка', 'алатки')}
          </p>
          <h3 className="mt-2 font-display text-xl leading-tight font-extrabold">
            <Link to={`/najdobri/${collection.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
              {collection.title}
            </Link>
          </h3>
          <p className="mt-2 text-[0.9375rem] leading-6 text-graphite">{collection.description}</p>
          {collection.tools.length ? (
            <p className="mt-3 font-hand text-xl leading-6 text-ink">{collection.tools.map((tool) => tool.name).join(', ')}…</p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
