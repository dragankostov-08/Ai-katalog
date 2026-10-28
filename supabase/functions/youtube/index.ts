// Supabase Edge Function (Deno): YouTube search and metadata lookup for editors.
//
// The YouTube Data API key lives only here, as the secret YOUTUBE_API_KEY:
//   supabase secrets set YOUTUBE_API_KEY=...
//   supabase functions deploy youtube
// Callers must be signed-in staff (checked with public.is_staff()). The function
// never writes to the database: editors decide which results to attach.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const API = 'https://www.googleapis.com/youtube/v3'
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const LANGUAGES: Record<string, string | undefined> = { mk: 'mk', regional: 'sr', en: 'en', any: undefined }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/** ISO 8601 duration (PT1H2M3S) → seconds. */
function parseDuration(value: string | undefined): number | null {
  const match = value?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return null
  const [, d, h, m, s] = match.map((part) => Number(part ?? 0))
  return d * 86400 + h * 3600 + m * 60 + s
}

function guessLanguage(code: string | undefined): string {
  if (!code) return 'other'
  const lang = code.toLowerCase().split('-')[0]
  if (lang === 'mk') return 'mk'
  if (['sr', 'hr', 'bs', 'bg', 'sh', 'cnr'].includes(lang)) return 'regional'
  if (lang === 'en') return 'en'
  return 'other'
}

interface YouTubeVideo {
  id: string
  snippet?: {
    title?: string
    channelTitle?: string
    channelId?: string
    publishedAt?: string
    defaultAudioLanguage?: string
    defaultLanguage?: string
    thumbnails?: { medium?: { url?: string } }
  }
  contentDetails?: { duration?: string }
  status?: { embeddable?: boolean; privacyStatus?: string }
}

async function lookup(ids: string[], key: string) {
  if (!ids.length) return []
  const url = `${API}/videos?part=snippet,contentDetails,status&id=${ids.join(',')}&key=${key}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`YouTube API ${response.status}`)
  const data = (await response.json()) as { items?: YouTubeVideo[] }
  return (data.items ?? [])
    .filter((video) => video.status?.privacyStatus !== 'private')
    .map((video) => ({
      youtube_id: video.id,
      title: video.snippet?.title ?? '',
      channel_title: video.snippet?.channelTitle ?? null,
      channel_id: video.snippet?.channelId ?? null,
      video_published_at: video.snippet?.publishedAt ?? null,
      duration_seconds: parseDuration(video.contentDetails?.duration),
      thumbnail_url: video.snippet?.thumbnails?.medium?.url ?? null,
      embeddable: video.status?.embeddable !== false,
      language: guessLanguage(video.snippet?.defaultAudioLanguage ?? video.snippet?.defaultLanguage),
    }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const key = Deno.env.get('YOUTUBE_API_KEY')
  if (!key) return json(503, { error: 'not_configured', message: 'YOUTUBE_API_KEY не е поставен.' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
  const { data: isStaff, error: authError } = await supabase.rpc('is_staff')
  if (authError || isStaff !== true) return json(403, { error: 'forbidden', message: 'Само за уредници.' })

  let body: { action?: string; query?: string; language?: string; ids?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  try {
    if (body.action === 'search') {
      const query = String(body.query ?? '').trim()
      if (query.length < 2 || query.length > 120) return json(400, { error: 'invalid_query', message: 'Внеси барање од 2 до 120 знаци.' })
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: '12',
        q: query,
        safeSearch: 'strict',
        videoEmbeddable: 'true',
        key,
      })
      const relevance = LANGUAGES[String(body.language ?? 'any')]
      if (relevance) params.set('relevanceLanguage', relevance)
      const response = await fetch(`${API}/search?${params}`)
      if (!response.ok) {
        const status = response.status === 403 ? 429 : 502
        return json(status, { error: 'youtube_error', message: response.status === 403 ? 'Дневната квота за YouTube API е потрошена.' : 'YouTube API не одговори.' })
      }
      const data = (await response.json()) as { items?: { id?: { videoId?: string } }[] }
      const ids = (data.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => !!id && ID_PATTERN.test(id))
      return json(200, { items: await lookup(ids, key) })
    }

    if (body.action === 'lookup') {
      const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string' && ID_PATTERN.test(id)).slice(0, 50) : []
      const items = await lookup(ids, key)
      const found = new Set(items.map((item) => item.youtube_id))
      return json(200, { items, missing: ids.filter((id) => !found.has(id)) })
    }

    return json(400, { error: 'unknown_action' })
  } catch (error) {
    return json(502, { error: 'youtube_error', message: String(error instanceof Error ? error.message : error) })
  }
})
