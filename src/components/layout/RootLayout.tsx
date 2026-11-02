import { Outlet, ScrollRestoration } from 'react-router'
import { CompareTray } from '../catalog/CompareTray'
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
        className="sr-only z-[70] bg-tomato px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Прескокни до содржината
      </a>
      <NavigationProgress />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CompareTray />
      <ConsentBanner />
      <DocumentHead />
      <ScrollRestoration />
    </>
  )
}
