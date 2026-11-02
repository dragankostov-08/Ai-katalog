import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { fetchSitemap } from './lib/api'
import { env, isBackendConfigured } from './lib/env'
import { errorMeta, notFoundMeta, renderHeadHtml, resolveMeta, type PageMeta } from './lib/seo'
import { NOINDEX_STATIC_PATHS, routes, STATIC_PATHS } from './routes'

// Admin routes are client-only and never pre-rendered.
const publicRoutes = routes.filter((route) => route.path !== '/admin/*')
const handler = createStaticHandler(publicRoutes)

export interface RenderResult {
  status: number
  html: string
  head: string
  redirect?: string
  error?: string
}

export async function render(url: string, origin: string): Promise<RenderResult> {
  const request = new Request(new URL(url, origin))
  const context = await handler.query(request)

  if (context instanceof Response) {
    return { status: context.status, html: '', head: '', redirect: context.headers.get('Location') ?? undefined }
  }

  const router = createStaticRouter(handler.dataRoutes, context)
  const html = renderToString(
    <StrictMode>
      <StaticRouterProvider router={router} context={context} />
    </StrictMode>,
  )

  let meta: PageMeta | null
  const firstError = context.errors ? Object.values(context.errors)[0] : undefined
  if (context.errors) {
    meta = context.statusCode === 404 ? notFoundMeta : errorMeta
  } else {
    const location = new URL(request.url)
    meta = resolveMeta(
      context.matches.map((match) => ({
        handle: match.route.handle,
        params: match.params,
        loaderData: context.loaderData[match.route.id],
      })),
      { pathname: location.pathname, search: location.search },
    )
  }

  return {
    status: context.statusCode,
    html,
    head: `${renderHeadHtml(meta ?? notFoundMeta)}\n    <script>window.__AIK_RENDERED_URL=${JSON.stringify(url).replace(/</g, '\\u003c')}</script>`,
    error: firstError instanceof Error ? firstError.message : undefined,
  }
}

export async function listPaths(): Promise<{ indexable: { path: string; lastmod?: string }[]; extra: string[] }> {
  const indexable: { path: string; lastmod?: string }[] = STATIC_PATHS.map((path) => ({ path }))
  if (isBackendConfigured) {
    const sitemap = await fetchSitemap()
    sitemap.categories.forEach((c) => indexable.push({ path: `/kategorii/${c.slug}`, lastmod: c.updated_at }))
    sitemap.tools.forEach((t) => indexable.push({ path: `/alatka/${t.slug}`, lastmod: t.updated_at }))
    sitemap.articles.forEach((a) => indexable.push({ path: `/vodici/${a.slug}`, lastmod: a.updated_at }))
    sitemap.comparisons.forEach((c) => indexable.push({ path: `/sporedbi/${c.slug}`, lastmod: c.updated_at }))
    sitemap.collections.forEach((c) => indexable.push({ path: `/najdobri/${c.slug}`, lastmod: c.updated_at }))
    sitemap.prompts.forEach((p) => indexable.push({ path: `/promptovi/${p.slug}`, lastmod: p.updated_at }))
    sitemap.glossary.forEach((g) => indexable.push({ path: `/recnik/${g.slug}`, lastmod: g.updated_at }))
    sitemap.learning_paths.forEach((p) => indexable.push({ path: `/patki/${p.slug}`, lastmod: p.updated_at }))
    sitemap.alternatives.forEach((a) => indexable.push({ path: `/alternativi/${a.slug}`, lastmod: a.updated_at }))
    if (sitemap.has_language_tests) indexable.push({ path: '/testirano-na-makedonski' })
  }
  const extra = [...NOINDEX_STATIC_PATHS]
  if (!indexable.some((entry) => entry.path === '/testirano-na-makedonski')) extra.push('/testirano-na-makedonski')
  return { indexable, extra }
}

export { env, isBackendConfigured }
