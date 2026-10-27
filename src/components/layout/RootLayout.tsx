import { Outlet, ScrollRestoration } from 'react-router'
import { ConsentBanner } from './ConsentBanner'
import { DocumentHead } from './DocumentHead'
import { Footer } from './Footer'
import { Header } from './Header'
import { NavigationProgress } from './NavigationProgress'

export function RootLayout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[70] bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Прескокни до содржината
      </a>
      <NavigationProgress />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <ConsentBanner />
      <DocumentHead />
      <ScrollRestoration />
    </>
  )
}
