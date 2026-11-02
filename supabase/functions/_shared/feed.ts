// RSS 2.0 / Atom parser and AI-topic filter. Dependency-free so it runs in
// Deno (Edge Functions), Node (local ingest script) and Vitest.

export interface FeedItem {
  title: string
  url: string
  summary: string | null
  published_at: string | null
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' }

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : ''
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })
}

function unwrap(value: string): string {
  const cdata = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return cdata ? cdata[1] : value
}

/** Plain text from feed HTML: tags removed, entities decoded, whitespace collapsed. */
export function toText(value: string): string {
  const withoutTags = decodeEntities(unwrap(value))
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim()
}

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? match[1] : null
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function toIso(value: string | null): string | null {
  if (!value) return null
  const date = new Date(toText(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cleanUrl(value: string | null): string | null {
  if (!value) return null
  const url = toText(value)
  return /^https?:\/\/\S+$/i.test(url) && url.length <= 1000 ? url : null
}

export function parseFeed(xml: string, limit = 50): FeedItem[] {
  const items: FeedItem[] = []
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml)
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? []

  for (const block of blocks.slice(0, limit)) {
    const title = toText(tag(block, 'title') ?? '')
    let url: string | null
    if (isAtom) {
      const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1])
      const preferred = links.find((attrs) => /rel=["']alternate["']/i.test(attrs)) ?? links.find((attrs) => !/rel=/i.test(attrs)) ?? links[0]
      url = cleanUrl(preferred?.match(/href=["']([^"']+)["']/i)?.[1] ?? null)
    } else {
      url = cleanUrl(tag(block, 'link')) ?? cleanUrl(tag(block, 'guid'))
    }
    const rawSummary = tag(block, 'description') ?? tag(block, 'summary') ?? tag(block, 'content') ?? ''
    const summary = truncate(toText(rawSummary), 280) || null
    const published = toIso(tag(block, 'pubDate') ?? tag(block, 'published') ?? tag(block, 'updated') ?? tag(block, 'dc:date'))
    if (title.length >= 3 && url) items.push({ title: truncate(title, 300), url, summary, published_at: published })
  }
  return items
}

const AI_PATTERNS = [
  /\bA\.?I\.?\b/, // AI as an upper-case token (not "ai" inside words)
  /вештачк\p{L}*\s+интелигенциј/iu,
  /машинск\p{L}*\s+учење/iu,
  /невронск\p{L}*\s+мреж/iu,
  /генеративн/iu,
  /јазичн\p{L}*\s+модел/iu,
  /\b(chat\s?gpt|openai|gemini|claude|anthropic|copilot|midjourney|deepseek|llama|mistral|perplexity|hugging\s?face|llm|gpt-\d)/i,
  /(четбот|чет-бот|чатбот)/iu,
]

export function isAiRelated(text: string): boolean {
  return AI_PATTERNS.some((pattern) => pattern.test(text))
}
