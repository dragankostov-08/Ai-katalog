import { ListOrdered } from 'lucide-react'
import { Link } from 'react-router'
import { plural } from '../../lib/labels'
import type { CollectionCard as CollectionCardData } from '../../lib/types'
import { ToolLogo } from '../catalog/ToolLogo'

export function CollectionCard({ collection }: { collection: CollectionCardData; index?: number }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-light bg-white p-4 shadow-sm transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-offset-sm">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-tomato-ink">
        <ListOrdered className="h-3.5 w-3.5" aria-hidden />
        {collection.kind === 'audience' && collection.audience_label ? `За: ${collection.audience_label}` : 'Најдобри'} · {collection.tool_count}{' '}
        {plural(collection.tool_count, 'алатка', 'алатки')}
      </p>
      <h3 className="mt-2 font-bold leading-snug">
        <Link to={`/najdobri/${collection.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
          {collection.title}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-graphite">{collection.description}</p>
      {collection.tools.length ? (
        <div className="mt-auto flex items-center pt-4">
          {collection.tools.slice(0, 5).map((tool, index) => (
            <span key={tool.slug} title={tool.name} className={`rounded-lg ring-2 ring-white ${index ? '-ml-2' : ''}`}>
              <ToolLogo name={tool.name} src={tool.logo_url} size="sm" />
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
