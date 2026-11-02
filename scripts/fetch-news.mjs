// Fetches the RSS/Atom feeds of active news sources and stores AI headlines,
// using the same parser as the `fetch-news` Edge Function. Connects straight to
// PostgreSQL, so it can also run from a scheduled CI job.
//
//   DATABASE_URL=postgres://… node --experimental-strip-types scripts/fetch-news.mjs
//   … scripts/fetch-news.mjs --file feed.xml --feed https://it.mk/feed/   # ingest a saved feed (testing)
import fs from 'node:fs/promises'
import pg from 'pg'
import { isAiRelated, parseFeed } from '../supabase/functions/_shared/feed.ts'

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_katalog_local' })
await client.connect()

const file = option('--file')
const feedFilter = option('--feed')
const { rows: sources } = await client.query(
  'select id, name, feed_url, ai_filter from public.news_sources where is_active and ($1::text is null or feed_url = $1)',
  [feedFilter ?? null],
)

for (const source of sources) {
  try {
    let xml
    if (file) {
      xml = await fs.readFile(file, 'utf8')
    } else {
      const response = await fetch(source.feed_url, {
        headers: { 'User-Agent': 'AI-KATALOG-NewsBot/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9' },
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      xml = await response.text()
    }
    const items = parseFeed(xml).filter((item) => !source.ai_filter || isAiRelated(`${item.title} ${item.summary ?? ''}`))
    const { rows } = await client.query('select public.ingest_news($1, $2) as added', [source.id, JSON.stringify(items)])
    console.log(`${source.name}: ${rows[0].added} new of ${items.length} AI items`)
  } catch (error) {
    await client.query('select public.record_news_error($1, $2)', [source.id, String(error.message ?? error)])
    console.log(`${source.name}: error — ${error.message ?? error}`)
  }
}
await client.end()
