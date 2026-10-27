const trimSlash = (value: string) => value.replace(/\/+$/, '')

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? trimSlash(import.meta.env.VITE_SUPABASE_URL) : undefined,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || undefined,
  siteUrl: trimSlash(import.meta.env.VITE_SITE_URL || 'http://localhost:5173'),
  adsenseClient: import.meta.env.VITE_ADSENSE_CLIENT || undefined,
  adSlots: {
    home: import.meta.env.VITE_AD_SLOT_HOME || undefined,
    directory: import.meta.env.VITE_AD_SLOT_DIRECTORY || undefined,
    tool: import.meta.env.VITE_AD_SLOT_TOOL || undefined,
    article: import.meta.env.VITE_AD_SLOT_ARTICLE || undefined,
    comparison: import.meta.env.VITE_AD_SLOT_COMPARISON || undefined,
  },
  buildTime: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : new Date(0).toISOString(),
  isDev: import.meta.env.DEV,
}

export const isBackendConfigured = Boolean(env.supabaseUrl && env.supabaseKey)

export const isBrowser = typeof window !== 'undefined'
