import { useEffect, useRef, useState } from 'react'
import { useConsent } from '../../lib/consent'
import { env } from '../../lib/env'

export type AdPlacement = keyof typeof env.adSlots

let scriptRequested = false

function loadAdSense(client: string) {
  if (scriptRequested) return
  scriptRequested = true
  const script = document.createElement('script')
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  document.head.appendChild(script)
}

function AdSenseUnit({ client, slot }: { client: string; slot: string }) {
  const pushed = useRef(false)
  useEffect(() => {
    loadAdSense(client)
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // The provider script failed or was blocked; leave the slot empty.
    }
  }, [client])

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

/**
 * Reusable advertising placement. Renders nothing unless an approved ad
 * account and slot are configured AND the visitor consented to advertising.
 * In development an outline marks where the slot would appear.
 */
export function AdSlot({ placement, className = '' }: { placement: AdPlacement; className?: string }) {
  const consent = useConsent()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null
  const slot = env.adSlots[placement]
  const client = env.adsenseClient

  if (!client || !slot) {
    if (!env.isDev) return null
    return (
      <div className={`flex min-h-24 items-center justify-center border border-dashed border-mid ${className}`}>
        <span className="label-mono text-graphite">Рекламен простор · {placement} · само во развој</span>
      </div>
    )
  }
  if (!consent.advertising) return null

  return (
    <aside aria-label="Реклама" className={`border-y border-ink/15 py-3 ${className}`}>
      <p className="label-mono mb-2 text-graphite">Реклама</p>
      <div className="min-h-[100px]">
        <AdSenseUnit client={client} slot={slot} />
      </div>
    </aside>
  )
}
