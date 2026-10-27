import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import type { ArticleCard as ArticleCardData } from '../../lib/types'
import { TypographicCover } from './TypographicCover'

function Cover({ article, size = 'md' }: { article: ArticleCardData; size?: 'md' | 'lg' }) {
  if (article.cover_image_url) {
    return (
      <div className={`overflow-hidden border border-ink bg-cream ${size === 'lg' ? 'aspect-[4/3] md:aspect-[16/11]' : 'aspect-[16/10]'}`}>
        <img
          src={article.cover_image_url}
          alt={article.cover_image_alt ?? ''}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover grayscale-[35%] transition duration-500 group-hover:scale-[1.02] group-hover:grayscale-0"
        />
      </div>
    )
  }
  return <TypographicCover slug={article.slug} title={article.title} label={article.category?.name ?? 'Водич'} size={size} />
}

export function ArticleMeta({ article }: { article: ArticleCardData }) {
  return (
    <p className="font-mono text-xs text-graphite">
      <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
      <span aria-hidden> · </span>
      {article.reading_minutes} мин. читање
    </p>
  )
}

export function ArticleCard({ article, variant = 'standard' }: { article: ArticleCardData; variant?: 'lead' | 'standard' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <article className="group relative border-b border-ink/20 py-4">
        {article.category ? <p className="label-mono mb-1 text-tomato-ink">{article.category.name}</p> : null}
        <h3 className="font-display text-lg leading-snug font-bold">
          <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
            {article.title}
          </Link>
        </h3>
        <div className="mt-1.5">
          <ArticleMeta article={article} />
        </div>
      </article>
    )
  }

  if (variant === 'lead') {
    return (
      <article className="group relative grid gap-5 md:grid-cols-[1.15fr_1fr] md:gap-8">
        <Cover article={article} size="lg" />
        <div className="flex flex-col justify-center">
          <p className="label-mono mb-3 text-tomato-ink">{article.category?.name ?? 'Водич'}</p>
          <h3 className="font-display text-[1.75rem] leading-[1.05] font-extrabold tracking-[-0.02em] md:text-[2.4rem]">
            <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-[3px] group-hover:underline-offset-[6px]">
              {article.title}
            </Link>
          </h3>
          <p className="mt-4 font-serif text-lg leading-relaxed text-graphite italic">{article.excerpt}</p>
          <div className="mt-5 border-t border-ink/20 pt-3">
            <ArticleMeta article={article} />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative flex flex-col">
      <Cover article={article} />
      {article.category ? <p className="label-mono mt-4 text-tomato-ink">{article.category.name}</p> : null}
      <h3 className="mt-2 font-display text-xl leading-snug font-bold">
        <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:decoration-2 group-hover:underline-offset-4">
          {article.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-graphite">{article.excerpt}</p>
      <div className="mt-3">
        <ArticleMeta article={article} />
      </div>
    </article>
  )
}
