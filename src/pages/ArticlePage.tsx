import { useEffect, useMemo } from 'react'
import { useLoaderData } from 'react-router'
import { ToolGrid } from '../components/catalog/ToolGrid'
import { AdSlot } from '../components/editorial/AdSlot'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { NewsletterSignup } from '../components/editorial/NewsletterSignup'
import { PreviewBanner } from '../components/editorial/Notices'
import { TableOfContents } from '../components/editorial/TableOfContents'
import { TypographicCover } from '../components/editorial/TypographicCover'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SectionHeader } from '../components/ui/SectionHeader'
import { trackEvent } from '../lib/analytics'
import { fetchArticle } from '../lib/api'
import { formatDate } from '../lib/format'
import { isPreview, notFound } from '../lib/loaders'
import { extractHeadings, Markdown, parseMarkdown } from '../lib/markdown'
import { absoluteUrl, breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { ArticleDetailData } from '../lib/types'

type ArticlePageData = ArticleDetailData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<ArticlePageData> {
  const preview = isPreview(request)
  const detail = await fetchArticle(params.slug ?? '', preview, request.signal)
  if (!detail) notFound()
  return { ...detail, preview }
}

const DAY = 86_400_000

export const handle: RouteHandle<ArticlePageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { article } = data
    const path = `/vodici/${article.slug}`
    return {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt,
      path,
      type: 'article',
      image: article.cover_image_url ?? undefined,
      noindex: data.preview,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          inLanguage: 'mk',
          datePublished: article.published_at,
          dateModified: article.updated_at,
          mainEntityOfPage: absoluteUrl(path),
          ...(article.cover_image_url ? { image: [article.cover_image_url] } : {}),
          ...(article.author_name ? { author: { '@type': 'Organization', name: article.author_name } } : {}),
          publisher: { '@type': 'Organization', name: 'AI KATALOG' },
        },
        breadcrumbJsonLd([
          { name: 'Почетна', path: '/' },
          { name: 'Водичи', path: '/vodici' },
          { name: article.title, path },
        ]),
      ],
    }
  },
}

export function Component() {
  const { article, tools, related, preview } = useLoaderData() as ArticlePageData
  const blocks = useMemo(() => parseMarkdown(article.content), [article.content])
  const headings = useMemo(() => extractHeadings(blocks), [blocks])
  const showToc = headings.length >= 3
  const updated =
    article.published_at && new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > DAY ? article.updated_at : null

  useEffect(() => {
    if (!preview) trackEvent('article_view', article.slug)
  }, [article.slug, preview])

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Водичи', path: '/vodici' }, { name: article.title }]} />

      <header className="mx-auto max-w-4xl text-center">
        <p className="label-mono text-tomato-ink">{article.category?.name ?? 'Водич'}</p>
        <h1 className="mt-4 font-display text-4xl leading-[0.98] font-black tracking-[-0.03em] md:text-6xl">{article.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl font-serif text-xl leading-relaxed text-graphite italic md:text-2xl">{article.excerpt}</p>
        <p className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-xs text-graphite">
          {article.author_name ? <span>{article.author_name}</span> : null}
          {article.published_at ? (
            <span>
              Објавено <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            </span>
          ) : null}
          {updated ? (
            <span>
              Ажурирано <time dateTime={updated}>{formatDate(updated)}</time>
            </span>
          ) : null}
          <span>{article.reading_minutes} мин. читање</span>
        </p>
      </header>

      <figure className="mx-auto mt-10 max-w-5xl">
        {article.cover_image_url ? (
          <img
            src={article.cover_image_url}
            alt={article.cover_image_alt ?? ''}
            className="aspect-[16/8] w-full border border-ink object-cover"
            width={1280}
            height={640}
            fetchPriority="high"
          />
        ) : (
          <TypographicCover slug={article.slug} title={article.title} label={article.category?.name ?? 'Водич'} size="lg" />
        )}
        {article.cover_caption ? <figcaption className="mt-2 font-mono text-xs text-graphite">{article.cover_caption}</figcaption> : null}
      </figure>

      <div className={`mx-auto mt-12 grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 ${showToc ? 'lg:grid-cols-[14rem_minmax(0,1fr)]' : ''}`}>
        {showToc ? (
          <div>
            <TableOfContents headings={headings} />
          </div>
        ) : null}
        <div className={showToc ? 'min-w-0' : 'mx-auto w-full max-w-2xl min-w-0'}>
          <Markdown blocks={blocks} insert={{ beforeHeading: 3, node: <AdSlot placement="article" className="my-10" /> }} />
          <div className="mt-14 max-w-2xl border-t-2 border-ink pt-6">
            <p className="label-mono text-graphite">Билтен</p>
            <p className="mt-1 mb-4 font-display text-xl font-bold">Добивај нови водичи на е-пошта</p>
            <NewsletterSignup />
          </div>
        </div>
      </div>

      {tools.length ? (
        <section className="mt-20" aria-labelledby="article-tools">
          <SectionHeader id="article-tools" index="Спомнати" title="Алатки од овој водич" />
          <ToolGrid tools={tools} columns={4} />
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-16" aria-labelledby="article-related">
          <SectionHeader id="article-related" index="Прочитај и" title="Поврзани водичи" link={{ to: '/vodici', label: 'Сите водичи' }} />
          <ul className="grid gap-8 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <ArticleCard article={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
