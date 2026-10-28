export type VideoLanguage = 'mk' | 'regional' | 'en' | 'other'

export const videoLanguageLabels: Record<VideoLanguage, string> = {
  mk: 'На македонски',
  regional: 'Регионален јазик',
  en: 'На англиски',
  other: 'Друг јазик',
}

const ID = /^[A-Za-z0-9_-]{11}$/

/** Extracts the 11-character video id from any common YouTube URL (or a bare id). */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (ID.test(value)) return value
  let url: URL
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let candidate: string | null = null
  if (host === 'youtu.be') candidate = url.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    candidate = url.searchParams.get('v')
    const path = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)
    if (!candidate && path) candidate = path[1]
  }
  return candidate && ID.test(candidate) ? candidate : null
}

/** 125 → „2:05“, 3723 → „1:02:03“. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
