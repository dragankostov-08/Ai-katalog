import { describe, expect, it } from 'vitest'
import { formatDate, formatPrice } from './format'
import { plural } from './labels'
import { breadcrumbJsonLd, renderHeadHtml } from './seo'
import { slugify } from './slug'

describe('slugify', () => {
  it('transliterates Macedonian Cyrillic', () => {
    expect(slugify('Генерирање слики')).toBe('generiranje-sliki')
    expect(slugify('Ѓорѓи Ќерамитчиев Џеб Ѕвезда Љубов Њива')).toBe('gjorgji-kjeramitchiev-dzheb-dzvezda-ljubov-njiva')
    expect(slugify('  ChatGPT — 4o!  ')).toBe('chatgpt-4o')
  })
})

describe('plural', () => {
  it('follows Macedonian count agreement', () => {
    expect([1, 2, 11, 21, 101, 111].map((n) => plural(n, 'алатка', 'алатки'))).toEqual(['алатка', 'алатки', 'алатки', 'алатка', 'алатка', 'алатки'])
  })
})

describe('format', () => {
  it('formats dates in Macedonian without the year suffix', () => {
    expect(formatDate('2026-10-27T10:00:00Z')).toBe('27 октомври 2026')
    expect(formatDate(null)).toBe('')
  })
  it('formats prices only when amount and currency exist', () => {
    expect(formatPrice(20, 'USD', 'month')).toBe('20 USD месечно')
    expect(formatPrice(19.5, 'EUR', null)).toBe('19,50 EUR')
    expect(formatPrice(20, null, 'month')).toBeNull()
    expect(formatPrice(1234.5, 'MKD', null)).toBe('1.234,50 MKD')
  })
})

describe('seo', () => {
  it('escapes head values and JSON-LD', () => {
    const head = renderHeadHtml({
      title: 'A "quoted" <title>',
      path: '/x',
      jsonLd: [{ name: '</script><script>alert(1)</script>' }],
    })
    expect(head).toContain('&quot;quoted&quot; &lt;title&gt;')
    expect(head).not.toContain('</script><script>')
    expect(head).toContain('rel="canonical"')
  })
  it('noindex pages say so and keep follow', () => {
    expect(renderHeadHtml({ title: 'x', noindex: true })).toContain('content="noindex, follow"')
  })
  it('builds breadcrumb structured data with absolute URLs', () => {
    const data = breadcrumbJsonLd([{ name: 'Почетна', path: '/' }]) as { itemListElement: { item: string }[] }
    expect(data.itemListElement[0].item).toMatch(/^https?:\/\//)
  })
})
