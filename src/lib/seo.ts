import type { Location, Params, UIMatch } from 'react-router'
import { env } from './env'

export const SITE_NAME = 'AI KATALOG'
export const DEFAULT_DESCRIPTION =
  'Откриј, спореди и научи да користиш AI алатки за работа, учење и креативност. Независен каталог на македонски јазик.'

export interface PageMeta {
  /** Page title without the site name. */
  title: string
  description?: string
  /** Canonical path (without origin). Omit for pages that must not declare one. */
  path?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  publishedTime?: string | null
  modifiedTime?: string | null
  jsonLd?: Record<string, unknown>[]
}

export interface MetaArgs<T = unknown> {
  data: T
  params: Params
  location: Pick<Location, 'pathname' | 'search'>
}

export interface RouteHandle<T = unknown> {
  meta?: (args: MetaArgs<T>) => PageMeta
}

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${env.siteUrl}${path}`)

export function fullTitle(meta: PageMeta): string {
  return meta.title ? `${meta.title} — ${SITE_NAME}` : `${SITE_NAME} — AI алатки на македонски`
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

interface HeadTag {
  tag: 'title' | 'meta' | 'link' | 'script'
  attrs: Record<string, string>
  content?: string
}

export function headTags(meta: PageMeta): HeadTag[] {
  const description = meta.description || DEFAULT_DESCRIPTION
  const title = fullTitle(meta)
  const image = absoluteUrl(meta.image || '/og-default.png')
  const tags: HeadTag[] = [
    { tag: 'title', attrs: {}, content: title },
    { tag: 'meta', attrs: { name: 'description', content: description } },
    { tag: 'meta', attrs: { name: 'robots', content: meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'mk_MK' } },
    { tag: 'meta', attrs: { property: 'og:type', content: meta.type || 'website' } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.title || SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:description', content: description } },
    { tag: 'meta', attrs: { property: 'og:image', content: image } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  ]
  if (meta.path) {
    const url = absoluteUrl(meta.path)
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: url } })
    tags.push({ tag: 'meta', attrs: { property: 'og:url', content: url } })
  }
  if (meta.publishedTime) tags.push({ tag: 'meta', attrs: { property: 'article:published_time', content: meta.publishedTime } })
  if (meta.modifiedTime) tags.push({ tag: 'meta', attrs: { property: 'article:modified_time', content: meta.modifiedTime } })
  for (const data of meta.jsonLd ?? []) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify(data) })
  }
  return tags
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Serialises head tags for the pre-rendered HTML. */
export function renderHeadHtml(meta: PageMeta): string {
  return headTags(meta)
    .map(({ tag, attrs, content }) => {
      const attributes = Object.entries(attrs)
        .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
        .join('')
      if (tag === 'title') return `<title>${escapeHtml(content ?? '')}</title>`
      if (tag === 'script') {
        // Prevent "</script>" inside JSON from closing the tag.
        return `<script${attributes} data-head="">${(content ?? '').replace(/</g, '\\u003c')}</script>`
      }
      return `<${tag}${attributes} data-head="">`
    })
    .join('\n    ')
}

/** Replaces the managed head tags in the browser after client navigation. */
export function applyHead(meta: PageMeta) {
  if (typeof document === 'undefined') return
  document.title = fullTitle(meta)
  document.head.querySelectorAll('[data-head]').forEach((element) => element.remove())
  for (const { tag, attrs, content } of headTags(meta)) {
    if (tag === 'title') continue
    const element = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value)
    element.setAttribute('data-head', '')
    if (content) element.textContent = content
    document.head.appendChild(element)
  }
}

export const notFoundMeta: PageMeta = {
  title: 'Страницата не е пронајдена',
  description: 'Страницата што ја барате не постои или е преместена.',
  noindex: true,
}

export const errorMeta: PageMeta = {
  title: 'Привремена грешка',
  description: 'Страницата моментално не може да се вчита.',
  noindex: true,
}

/** Finds the deepest route that declares metadata and evaluates it. */
export function resolveMeta(
  matches: Pick<UIMatch, 'handle' | 'loaderData' | 'params'>[],
  location: Pick<Location, 'pathname' | 'search'>,
): PageMeta | null {
  for (let index = matches.length - 1; index >= 0; index--) {
    const { handle, loaderData, params } = matches[index]
    const meta = (handle as RouteHandle | undefined)?.meta
    if (!meta) continue
    try {
      return meta({ data: loaderData, params, location })
    } catch {
      return null
    }
  }
  return null
}
