import type { RouteObject } from 'react-router'
import { HydrateFallback, PageErrorBoundary, RootErrorBoundary } from './components/layout/ErrorPages'
import { RootLayout } from './components/layout/RootLayout'
import { fetchSite } from './lib/api'
import { notFound } from './lib/loaders'
import { notFoundMeta, type RouteHandle } from './lib/seo'
import type { SiteData } from './lib/types'
import * as AlternativesIndexPage from './pages/AlternativesIndexPage'
import * as AlternativesPage from './pages/AlternativesPage'
import * as ArticlePage from './pages/ArticlePage'
import * as ArticlesPage from './pages/ArticlesPage'
import * as CategoriesPage from './pages/CategoriesPage'
import * as CategoryPage from './pages/CategoryPage'
import * as CollectionPage from './pages/CollectionPage'
import * as CollectionsPage from './pages/CollectionsPage'
import * as ComparePage from './pages/ComparePage'
import * as ComparisonPage from './pages/ComparisonPage'
import * as ComparisonsPage from './pages/ComparisonsPage'
import * as ContactPage from './pages/ContactPage'
import * as DirectoryPage from './pages/DirectoryPage'
import * as FavoritesPage from './pages/FavoritesPage'
import * as GlossaryPage from './pages/GlossaryPage'
import * as GlossaryTermPage from './pages/GlossaryTermPage'
import * as HomePage from './pages/HomePage'
import * as LanguageTestsPage from './pages/LanguageTestsPage'
import * as LearningPathPage from './pages/LearningPathPage'
import * as LearningPathsPage from './pages/LearningPathsPage'
import * as PromptPage from './pages/PromptPage'
import * as PromptsPage from './pages/PromptsPage'
import {
  aboutRoute,
  advertisingRoute,
  affiliateRoute,
  cookiesRoute,
  methodologyRoute,
  privacyRoute,
  termsRoute,
} from './pages/StaticPages'
import * as SubmitPage from './pages/SubmitPage'
import * as ToolPage from './pages/ToolPage'
import * as UnsubscribePage from './pages/UnsubscribePage'
import { watchConfirmRoute, watchUnsubscribeRoute } from './pages/WatchPages'
import * as WizardPage from './pages/WizardPage'

const EMPTY_SITE: SiteData = { settings: {}, categories: [], use_cases: [] }

/** Site-wide data. A failure here must not take the whole site down. */
async function rootLoader({ request }: { request: Request }): Promise<SiteData> {
  try {
    return await fetchSite(request.signal)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    console.error('[ai-katalog] site data unavailable:', error)
    return EMPTY_SITE
  }
}

const notFoundHandle: RouteHandle = { meta: () => notFoundMeta }

export const routes: RouteObject[] = [
  {
    id: 'root',
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    HydrateFallback,
    loader: rootLoader,
    shouldRevalidate: () => false,
    children: [
      {
        ErrorBoundary: PageErrorBoundary,
        children: [
          { index: true, ...HomePage },
          { path: 'alatki', ...DirectoryPage },
          { path: 'kategorii', ...CategoriesPage },
          { path: 'kategorii/:slug', ...CategoryPage },
          { path: 'alatka/:slug', ...ToolPage },
          { path: 'sporedbi', ...ComparisonsPage },
          { path: 'sporedbi/:slug', ...ComparisonPage },
          { path: 'vodici', ...ArticlesPage },
          { path: 'vodici/:slug', ...ArticlePage },
          { path: 'najdobri', ...CollectionsPage },
          { path: 'najdobri/:slug', ...CollectionPage },
          { path: 'pronajdi', ...WizardPage },
          { path: 'promptovi', ...PromptsPage },
          { path: 'promptovi/:slug', ...PromptPage },
          { path: 'recnik', ...GlossaryPage },
          { path: 'recnik/:slug', ...GlossaryTermPage },
          { path: 'testirano-na-makedonski', ...LanguageTestsPage },
          { path: 'alternativi', ...AlternativesIndexPage },
          { path: 'alternativi/:slug', ...AlternativesPage },
          { path: 'sporedi', ...ComparePage },
          { path: 'patki', ...LearningPathsPage },
          { path: 'patki/:slug', ...LearningPathPage },
          { path: 'sledi/potvrdi', ...watchConfirmRoute },
          { path: 'sledi/odjava', ...watchUnsubscribeRoute },
          { path: 'predlozi', ...SubmitPage },
          { path: 'kontakt', ...ContactPage },
          { path: 'omileni', ...FavoritesPage },
          { path: 'newsletter/odjava', ...UnsubscribePage },
          { path: 'za-nas', ...aboutRoute },
          { path: 'metodologija', ...methodologyRoute },
          { path: 'privatnost', ...privacyRoute },
          { path: 'uslovi', ...termsRoute },
          { path: 'kolacinja', ...cookiesRoute },
          { path: 'oglasuvanje', ...advertisingRoute },
          { path: 'affiliate-izjava', ...affiliateRoute },
          { path: '*', loader: () => notFound(), handle: notFoundHandle },
        ],
      },
    ],
  },
  {
    path: '/admin/*',
    lazy: async () => {
      const { AdminApp } = await import('./admin/AdminApp')
      return { Component: AdminApp }
    },
  },
]

/** Static, always-available public paths (data-driven paths come from the sitemap API). */
export const STATIC_PATHS = [
  '/',
  '/alatki',
  '/kategorii',
  '/sporedbi',
  '/vodici',
  '/najdobri',
  '/pronajdi',
  '/promptovi',
  '/recnik',
  '/patki',
  '/alternativi',
  '/predlozi',
  '/kontakt',
  '/za-nas',
  '/metodologija',
  '/privatnost',
  '/uslovi',
  '/kolacinja',
  '/oglasuvanje',
  '/affiliate-izjava',
]

/** Paths that exist but must never be indexed or listed in the sitemap. */
export const NOINDEX_STATIC_PATHS = ['/omileni', '/newsletter/odjava', '/sporedi', '/sledi/potvrdi', '/sledi/odjava']
