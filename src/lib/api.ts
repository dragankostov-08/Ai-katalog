import { isBrowser } from './env'
import { rpc } from './rest'
import type {
  ActionResult,
  ArticleCard,
  ArticleDetailData,
  CategoryDetailData,
  CollectionCard,
  CollectionDetailData,
  ComparisonCard,
  ComparisonDetailData,
  HomeData,
  SearchResult,
  SiteData,
  SitemapData,
  ToolCard,
  ToolDetailData,
  WizardTool,
} from './types'

type Signal = AbortSignal | undefined

/** Staff preview: attach the signed-in user's token so RLS can reveal drafts. */
async function previewToken(preview: boolean): Promise<string | undefined> {
  if (!preview || !isBrowser) return undefined
  const { getAccessToken } = await import('./supabase')
  return getAccessToken()
}

export const fetchSite = (signal?: Signal) => rpc<SiteData>('api_site', {}, { signal })

export const fetchHome = (signal?: Signal) => rpc<HomeData>('api_home', {}, { signal })

export interface SearchParams {
  query?: string
  category?: string
  useCase?: string
  pricing?: string[]
  freePlan?: boolean
  platform?: string
  sort?: string
  limit?: number
  offset?: number
}

export const searchTools = (params: SearchParams, signal?: Signal) =>
  rpc<SearchResult>(
    'api_search_tools',
    {
      p_query: params.query || null,
      p_category: params.category || null,
      p_use_case: params.useCase || null,
      p_pricing: params.pricing?.length ? params.pricing : null,
      p_free_plan: params.freePlan ? true : null,
      p_platform: params.platform || null,
      p_sort: params.sort || null,
      p_limit: params.limit ?? 24,
      p_offset: params.offset ?? 0,
    },
    { signal },
  )

export async function fetchCategory(slug: string, preview = false, signal?: Signal) {
  return rpc<CategoryDetailData | null>(
    'api_category',
    { p_slug: slug, p_preview: preview },
    { signal, accessToken: await previewToken(preview) },
  )
}

export async function fetchTool(slug: string, preview = false, signal?: Signal) {
  return rpc<ToolDetailData | null>(
    'api_tool',
    { p_slug: slug, p_preview: preview },
    { signal, accessToken: await previewToken(preview) },
  )
}

export const fetchArticles = (limit: number, offset: number, signal?: Signal) =>
  rpc<{ total: number; items: ArticleCard[] }>('api_articles', { p_limit: limit, p_offset: offset }, { signal })

export async function fetchArticle(slug: string, preview = false, signal?: Signal) {
  return rpc<ArticleDetailData | null>(
    'api_article',
    { p_slug: slug, p_preview: preview },
    { signal, accessToken: await previewToken(preview) },
  )
}

export const fetchComparisons = (signal?: Signal) => rpc<ComparisonCard[]>('api_comparisons', {}, { signal })

export async function fetchComparison(slug: string, preview = false, signal?: Signal) {
  return rpc<ComparisonDetailData | null>(
    'api_comparison',
    { p_slug: slug, p_preview: preview },
    { signal, accessToken: await previewToken(preview) },
  )
}

export const fetchCollections = (signal?: Signal) => rpc<CollectionCard[]>('api_collections', {}, { signal })

export async function fetchCollection(slug: string, preview = false, signal?: Signal) {
  return rpc<CollectionDetailData | null>(
    'api_collection',
    { p_slug: slug, p_preview: preview },
    { signal, accessToken: await previewToken(preview) },
  )
}

export const fetchWizardTools = (signal?: Signal) => rpc<WizardTool[]>('api_wizard_tools', {}, { signal })

export const fetchToolsBySlugs = (slugs: string[], signal?: Signal) =>
  rpc<ToolCard[]>('api_tools_by_slugs', { p_slugs: slugs }, { signal })

export const fetchSitemap = () => rpc<SitemapData>('api_sitemap')

export const submitTool = (input: {
  name: string
  url: string
  explanation: string
  email: string
  website: string
  elapsedMs: number
}) =>
  rpc<ActionResult>('submit_tool', {
    p_name: input.name,
    p_url: input.url,
    p_explanation: input.explanation,
    p_email: input.email || null,
    p_website: input.website,
    p_elapsed_ms: input.elapsedMs,
  })

export const sendContactMessage = (input: {
  name: string
  email: string
  topic: string
  message: string
  website: string
  elapsedMs: number
}) =>
  rpc<ActionResult>('send_contact_message', {
    p_name: input.name,
    p_email: input.email,
    p_topic: input.topic,
    p_message: input.message,
    p_website: input.website,
    p_elapsed_ms: input.elapsedMs,
  })

export const subscribeNewsletter = (email: string, consent: boolean, website: string) =>
  rpc<ActionResult>('newsletter_subscribe', {
    p_email: email,
    p_consent: consent,
    p_consent_version: 'v1-2026-10',
    p_website: website,
  })

export const unsubscribeNewsletter = (token: string) =>
  rpc<ActionResult>('newsletter_unsubscribe', { p_token: token })
