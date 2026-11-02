// Supabase Edge Function (Deno): reads the RSS/Atom feeds of the active news
// sources and stores new AI headlines (title, short excerpt, date, link).
//
// Called every hour by the scheduler (header x-cron-secret: CRON_SECRET) or by
// a signed-in editor from Admin → Вести („Освежи сега“).
//   supabase functions deploy fetch-news --no-verify-jwt
// Secrets: CRON_SECRET (shared with send-notifications), SITE_URL (for the bot's User-Agent).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { isAiRelated, parseFeed } from '../_shared/feed.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const MAX_BYTES = 2 * 1024 * 1024

async function readFeed(url: string, userAgent: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    if (text.length > MAX_BYTES) throw new Error('Фидот е поголем од 2 MB')
    return text
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  // Either the scheduler (shared secret) or a signed-in staff member.
  const secret = Deno.env.get('CRON_SECRET')
  let allowed = Boolean(secret) && req.headers.get('x-cron-secret') === secret
  if (!allowed) {
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    })
    const { data } = await user.rpc('is_staff')
    allowed = data === true
  }
  if (!allowed) return json(403, { message: 'Само за уредници или закажано извршување.' })

  const body = (await req.json().catch(() => ({}))) as { source_id?: string }
  let query = service.from('news_sources').select('id, name, feed_url, ai_filter').eq('is_active', true)
  if (body.source_id) query = query.eq('id', body.source_id)
  const { data: sources, error } = await query
  if (error) return json(500, { message: error.message })

  const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '')
  const userAgent = `AI-KATALOG-NewsBot/1.0 (+${site || 'https://ai-katalog'}/za-nas)`
  const report: { source: string; added?: number; error?: string }[] = []

  for (const source of sources ?? []) {
    try {
      const items = parseFeed(await readFeed(source.feed_url, userAgent)).filter(
        (item) => !source.ai_filter || isAiRelated(`${item.title} ${item.summary ?? ''}`),
      )
      const { data: added, error: ingestError } = await service.rpc('ingest_news', { p_source_id: source.id, p_items: items })
      if (ingestError) throw new Error(ingestError.message)
      report.push({ source: source.name, added: added as number })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      await service.rpc('record_news_error', { p_source_id: source.id, p_error: message })
      report.push({ source: source.name, error: message })
    }
  }
  return json(200, { report })
})
