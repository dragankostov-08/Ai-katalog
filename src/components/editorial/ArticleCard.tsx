import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import type { ArticleCard as ArticleCardData } from '../../lib/types'
import { TypographicCover } from './TypographicCover'

function Cover({ article, size = 'md' }: { article: ArticleCardData; size?: 'md' | 'lg' }) {
  if (article.cover_image_url) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-cream ${size === 'lg' ? 'aspect-[16/9] md:aspect-[16/7]' : 'aspect-[16/9]'}`}>
        <img src={article.cover_image_url} alt={article.cover_image_alt ?? ''} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      </div>
    )
  }
  return <TypographicCover slug={article.slug} title={article.title} label={article.category?.name ?? 'Водич'} size={size} />
}

export function ArticleMeta({ article }: { article: ArticleCardData }) {
  return (
    <p className="text-xs text-graphite">
      <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
      <span aria-hidden> · </span>
      {article.reading_minutes} мин. читање
    </p>
  )
}

export function ArticleCard({ article, variant = 'standard' }: { article: ArticleCardData; variant?: 'lead' | 'standard' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <article className="group relative rounded-xl p-3 transition-colors hover:bg-paper">
        {article.category ? <p className="mb-1 text-xs font-semibold text-tomato-ink">{article.category.name}</p> : null}
        <h3 className="font-semibold leading-snug">
          <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
            {article.title}
          </Link>
        </h3>
        <div className="mt-1">
          <ArticleMeta article={article} />
        </div>
      </article>
    )
  }

  if (variant === 'lead') {
    return (
      <article className="group relative grid gap-5 rounded-2xl border border-light bg-white p-4 shadow-sm md:grid-cols-[1.2fr_1fr] md:items-center md:gap-8">
        <Cover article={article} size="lg" />
        <div>
          <p className="mb-2 text-xs font-semibold text-tomato-ink">{article.category?.name ?? 'Водич'}</p>
          <h3 className="text-2xl leading-tight font-extrabold tracking-tight md:text-3xl">
            <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
              {article.title}
            </Link>
          </h3>
          <p className="mt-3 text-graphite">{article.excerpt}</p>
          <div className="mt-4">
            <ArticleMeta article={article} />
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-light bg-white p-3 shadow-sm transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-offset-sm">
      <Cover article={article} />
      <div className="flex flex-1 flex-col px-1 pt-3 pb-1">
        {article.category ? <p className="text-xs font-semibold text-tomato-ink">{article.category.name}</p> : null}
        <h3 className="mt-1 font-bold leading-snug">
          <Link to={`/vodici/${article.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-tomato-ink">
            {article.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-graphite">{article.excerpt}</p>
        <div className="mt-auto pt-3">
          <ArticleMeta article={article} />
        </div>
      </div>
    </article>
  )
}
