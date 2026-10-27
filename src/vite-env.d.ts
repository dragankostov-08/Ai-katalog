/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_AD_SLOT_HOME?: string
  readonly VITE_AD_SLOT_DIRECTORY?: string
  readonly VITE_AD_SLOT_TOOL?: string
  readonly VITE_AD_SLOT_ARTICLE?: string
  readonly VITE_AD_SLOT_COMPARISON?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_TIME__: string

interface Window {
  __staticRouterHydrationData?: unknown
  adsbygoogle?: unknown[]
}
