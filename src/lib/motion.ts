import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * GSAP-driven entrance and scroll animations.
 *
 * Content is never hidden by default: an inline script in index.html adds the
 * `js-motion` class to <html> (unless the visitor prefers reduced motion), and only
 * then does CSS hide `[data-hero-word]`, `[data-hero-fade]` and `[data-reveal]`.
 * If GSAP has not loaded within a few seconds the class is removed again, so a slow
 * or failed script load never leaves the page blank. GSAP is loaded lazily and stays
 * out of the critical bundle and the pre-rendered HTML.
 */
declare global {
  interface Window {
    __aikMotion?: boolean
  }
}

const CARD_SELECTOR = 'main article, main [data-reveal-item]'

export function useScrollMotion() {
  const { pathname } = useLocation()

  useEffect(() => {
    const root = document.documentElement
    if (!root.classList.contains('js-motion')) return
    let cleanup: (() => void) | undefined
    let cancelled = false

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return
        window.__aikMotion = true
        gsap.registerPlugin(ScrollTrigger)

        const ctx = gsap.context(() => {
          const words = gsap.utils.toArray<HTMLElement>('[data-hero-word]')
          if (words.length) {
            gsap.fromTo(words, { y: 0, yPercent: 110, opacity: 0 }, { y: 0, yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.07 })
          }
          const fades = gsap.utils.toArray<HTMLElement>('[data-hero-fade]')
          if (fades.length) {
            gsap.fromTo(fades, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.25 })
          }

          // Cards below the fold rise in as they scroll into view. Cards already
          // visible are left alone, so nothing that is on screen ever flickers.
          const fold = window.innerHeight
          const cards = gsap.utils
            .toArray<HTMLElement>(CARD_SELECTOR)
            .filter((element) => !element.closest('[data-reveal]') && element.getBoundingClientRect().top > fold)
          gsap.set(cards, { opacity: 0, y: 24 })

          const sections = gsap.utils.toArray<HTMLElement>('[data-reveal]')
          ScrollTrigger.batch([...sections, ...cards], {
            start: 'top 92%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, overwrite: true, clearProps: 'transform' }),
          })
          // Anything already scrolled past (e.g. restored scroll position) is shown at once.
          ScrollTrigger.refresh()
        })
        cleanup = () => ctx.revert()
      })
      .catch(() => root.classList.remove('js-motion'))

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [pathname])
}
