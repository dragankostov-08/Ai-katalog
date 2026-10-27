import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter, matchRoutes, type HydrationState } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { env } from './lib/env'
import { routes } from './routes'
import './styles/index.css'

const STALE_AFTER_MS = 10 * 60 * 1000

async function start() {
  const container = document.getElementById('root')!
  // Pre-rendered HTML is only valid for the exact URL it was rendered for
  // (e.g. /alatki without filters). Otherwise render fresh on the client.
  const renderedUrl = (window as Window & { __AIK_RENDERED_URL?: string }).__AIK_RENDERED_URL
  const exactMatch = renderedUrl === window.location.pathname + window.location.search
  const hydrationData = exactMatch ? (window.__staticRouterHydrationData as HydrationState | undefined) : undefined
  if (!exactMatch) {
    // createBrowserRouter reads this global by default; drop it so loaders run.
    window.__staticRouterHydrationData = undefined
    container.replaceChildren()
  }

  // Resolve lazy route modules for the initial URL before hydrating.
  const lazyMatches = matchRoutes(routes, window.location)?.filter((match) => match.route.lazy)
  if (lazyMatches?.length) {
    await Promise.all(
      lazyMatches.map(async (match) => {
        const lazy = match.route.lazy as () => Promise<Record<string, unknown>>
        Object.assign(match.route, await lazy(), { lazy: undefined })
      }),
    )
  }

  const router = createBrowserRouter(routes, { hydrationData })
  const app = (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )

  if (hydrationData && container.hasChildNodes()) {
    hydrateRoot(container, app)
    // Pre-rendered pages are refreshed in the background when the build is old,
    // so visitors always see current prices and statuses.
    if (Date.now() - new Date(env.buildTime).getTime() > STALE_AFTER_MS) {
      const refresh = () => void router.revalidate()
      if ('requestIdleCallback' in window) window.requestIdleCallback(refresh)
      else setTimeout(refresh, 1500)
    }
  } else {
    createRoot(container).render(app)
  }
}

start()
