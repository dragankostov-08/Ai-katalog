import { isBrowser } from './env'
import { rpc } from './rest'
import type {
  ActionResult,
  AlternativesData,
  AlternativesIndexItem,
  CompareData,
  GlossaryEntry,
  GlossaryTermData,
  LanguageTestGroup,
  LearningPathCard,
  LearningPathData,
  NewsData,
  PromptCard,
  PromptDetailData,
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

// Older databases (before the news migration) return no category_tools/news.
export const fetchHome = async (signal?: Signal): Promise<HomeData> => {
  const home = await rpc<HomeData>('api_home', {}, { signal })
  return { ...home, category_tools: home.category_tools ?? [], news: home.news ?? [] }
}

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

/* --- Growth features ------------------------------------------------------ */

export const fetchPrompts = (params: { query?: string; useCase?: string; tool?: string; limit: number; offset: number }, signal?: Signal) =>
  rpc<{ total: number; items: PromptCard[] }>(
    'api_prompts',
    { p_query: params.query || null, p_use_case: params.useCase || null, p_tool: params.tool || null, p_limit: params.limit, p_offset: params.offset },
    { signal },
  )

export async function fetchPrompt(slug: string, preview = false, signal?: Signal) {
  return rpc<PromptDetailData | null>('api_prompt', { p_slug: slug, p_preview: preview }, { signal, accessToken: await previewToken(preview) })
}

export const fetchGlossary = (signal?: Signal) => rpc<GlossaryEntry[]>('api_glossary', {}, { signal })

export async function fetchGlossaryTerm(slug: string, preview = false, signal?: Signal) {
  return rpc<GlossaryTermData | null>('api_glossary_term', { p_slug: slug, p_preview: preview }, { signal, accessToken: await previewToken(preview) })
}

export const fetchLanguageTests = (signal?: Signal) => rpc<LanguageTestGroup[]>('api_language_tests', {}, { signal })

export const fetchAlternatives = (slug: string, signal?: Signal) => rpc<AlternativesData | null>('api_alternatives', { p_slug: slug }, { signal })

export const fetchAlternativesIndex = (signal?: Signal) => rpc<AlternativesIndexItem[]>('api_alternatives_index', {}, { signal })

export const fetchCompare = (slugs: string[], signal?: Signal) => rpc<CompareData>('api_compare_tools', { p_slugs: slugs }, { signal })

export const fetchLearningPaths = (signal?: Signal) => rpc<LearningPathCard[]>('api_learning_paths', {}, { signal })

export async function fetchLearningPath(slug: string, preview = false, signal?: Signal) {
  return rpc<LearningPathData | null>('api_learning_path', { p_slug: slug, p_preview: preview }, { signal, accessToken: await previewToken(preview) })
}

export const watchTool = (slug: string, email: string, consent: boolean, website: string) =>
  rpc<ActionResult>('watch_tool', { p_tool_slug: slug, p_email: email, p_consent: consent, p_website: website })

export const confirmWatch = (id: string, token: string) =>
  rpc<ActionResult & { tool_name?: string; tool_slug?: string }>('confirm_watch', { p_id: id, p_token: token })

export const unwatchTool = (id: string, token: string) => rpc<ActionResult>('unwatch_tool', { p_id: id, p_token: token })

export const fetchNews = (params: { source?: string; limit: number; offset: number }, signal?: Signal) =>
  rpc<NewsData>('api_news', { p_source: params.source || null, p_limit: params.limit, p_offset: params.offset }, { signal })
