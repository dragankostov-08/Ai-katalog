import { domAnimation, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useScrollMotion } from '../../lib/motion'
import { CompareTray } from '../catalog/CompareTray'
import { ConsentBanner } from './ConsentBanner'
import { DocumentHead } from './DocumentHead'
import { Footer } from './Footer'
import { Header } from './Header'
import { NavigationProgress } from './NavigationProgress'

/**
 * Fades each new page in on client-side navigation. The first render (pre-rendered
 * HTML + hydration) is not animated, so the static page is never hidden.
 */
function PageTransition() {
  const { pathname } = useLocation()
  const firstPath = useRef(pathname)
  const animate = pathname !== firstPath.current
  return (
    <m.div
      key={pathname}
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <Outlet />
    </m.div>
  )
}

export function RootLayout() {
  useScrollMotion()
  return (
    <LazyMotion features={domAnimation} strict>
      <a
        href="#main"
        className="sr-only z-[70] bg-tomato px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Прескокни до содржината
      </a>
      <NavigationProgress />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageTransition />
      </main>
      <Footer />
      <CompareTray />
      <ConsentBanner />
      <DocumentHead />
      <ScrollRestoration />
    </LazyMotion>
  )
}
