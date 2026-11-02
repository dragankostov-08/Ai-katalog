import { pricePeriodLabels, pricingLabels, verdictLabels } from './labels'
import type { LanguageVerdict, PricePeriod, PricingType } from './types'

export interface DigestInput {
  since: string
  tools: { name: string; slug: string; short_description: string }[]
  price_changes: { name: string; slug: string; changes: { field: string; old: string | null; new: string | null }[] }[]
  articles: { title: string; slug: string }[]
  comparisons: { title: string; slug: string }[]
  prompts: { title: string; slug: string }[]
  learning_paths: { title: string; slug: string }[]
  glossary: { title: string; slug: string }[]
  language_tests: { title: string; tool: string; verdict: LanguageVerdict }[]
}

const FIELD_LABELS: Record<string, string> = {
  pricing_type: 'модел на плаќање',
  starting_price: 'почетна цена',
  currency: 'валута',
  price_period: 'период на плаќање',
  has_free_plan: 'бесплатен план',
  free_plan_limits: 'ограничувања на бесплатниот план',
}

/** Turns raw logged values (enum codes, JSON booleans) into readable Macedonian. */
export function describeValue(field: string, value: string | null): string {
  if (value === null || value === '' || value === 'null') return '—'
  const clean = value.replace(/^"|"$/g, '')
  if (field === 'pricing_type') return pricingLabels[clean as PricingType] ?? clean
  if (field === 'price_period') return pricePeriodLabels[clean as PricePeriod] ?? clean
  if (field === 'has_free_plan') return clean === 'true' ? 'да' : clean === 'false' ? 'не' : clean
  return clean
}

export function describeChange(change: { field: string; old: string | null; new: string | null }): string {
  return `${FIELD_LABELS[change.field] ?? change.field}: ${describeValue(change.field, change.old)} → ${describeValue(change.field, change.new)}`
}

const sections = (d: DigestInput, site: string) =>
  [
    { title: 'Нови алатки во каталогот', items: d.tools.map((t) => ({ text: `${t.name} — ${t.short_description}`, url: `${site}/alatka/${t.slug}` })) },
    {
      title: 'Потврдени промени на цени',
      items: d.price_changes.map((t) => ({ text: `${t.name}: ${t.changes.map(describeChange).join('; ')}`, url: `${site}/alatka/${t.slug}` })),
    },
    { title: 'Нови водичи', items: d.articles.map((a) => ({ text: a.title, url: `${site}/vodici/${a.slug}` })) },
    { title: 'Нови споредби', items: d.comparisons.map((a) => ({ text: a.title, url: `${site}/sporedbi/${a.slug}` })) },
    { title: 'Нови промптови', items: d.prompts.map((a) => ({ text: a.title, url: `${site}/promptovi/${a.slug}` })) },
    { title: 'Тестирано на македонски', items: d.language_tests.map((t) => ({ text: `${t.tool} — ${t.title}: ${verdictLabels[t.verdict].toLowerCase()}`, url: `${site}/testirano-na-makedonski` })) },
    { title: 'Нови патеки за учење', items: d.learning_paths.map((a) => ({ text: a.title, url: `${site}/patki/${a.slug}` })) },
    { title: 'Нови поими во речникот', items: d.glossary.map((a) => ({ text: a.title, url: `${site}/recnik/${a.slug}` })) },
  ].filter((section) => section.items.length)

export function isEmptyDigest(d: DigestInput) {
  return sections(d, '').length === 0
}

/** Plain text for Viber and Telegram channels. */
export function digestText(d: DigestInput, site: string, period: string): string {
  const parts = [`AI KATALOG · преглед ${period}`]
  for (const section of sections(d, site)) {
    parts.push('', section.title.toUpperCase(), ...section.items.map((item) => `• ${item.text}\n  ${item.url}`))
  }
  parts.push('', `Целиот каталог: ${site}`)
  return parts.join('\n')
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Simple, inline-styled HTML for the newsletter tool. */
export function digestHtml(d: DigestInput, site: string, period: string): string {
  const body = sections(d, site)
    .map(
      (section) =>
        `<h2 style="font-family:Arial,sans-serif;font-size:18px;margin:24px 0 8px">${escapeHtml(section.title)}</h2><ul style="padding-left:18px;margin:0">` +
        section.items.map((item) => `<li style="margin:6px 0"><a href="${escapeHtml(item.url)}">${escapeHtml(item.text)}</a></li>`).join('') +
        '</ul>',
    )
    .join('')
  return `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px"><h1 style="font-size:22px">AI KATALOG · преглед ${escapeHtml(period)}</h1>${body}<p style="margin-top:24px"><a href="${escapeHtml(site)}">Целиот каталог</a></p></div>`
}
