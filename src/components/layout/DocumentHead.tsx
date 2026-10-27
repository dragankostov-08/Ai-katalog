import { useEffect } from 'react'
import { useLocation, useMatches } from 'react-router'
import { applyHead, resolveMeta } from '../../lib/seo'

/** Keeps <title>, meta tags, canonical and JSON-LD in sync after client navigation. */
export function DocumentHead() {
  const matches = useMatches()
  const location = useLocation()

  useEffect(() => {
    const meta = resolveMeta(matches, location)
    if (meta) applyHead(meta)
  }, [matches, location])

  return null
}
