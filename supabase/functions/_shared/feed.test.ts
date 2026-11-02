import { describe, expect, it } from 'vitest'
import { isAiRelated, parseFeed, toText } from './feed'

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>Пример</title>
<item>
  <title><![CDATA[OpenAI објави нов модел за &#8222;македонски&#8220;]]></title>
  <link>https://primer.mk/openai-model/</link>
  <pubDate>Sun, 02 Nov 2026 09:30:00 +0100</pubDate>
  <description><![CDATA[<p>Новиот модел <strong>подобро</strong> разбира&nbsp;текст.</p><script>alert(1)</script>]]></description>
</item>
<item>
  <title>Нов телефон на пазарот</title>
  <link>https://primer.mk/telefon/</link>
  <description>Без врска со вештачка интелигенција? Да, всушност со неа.</description>
</item>
<item><title>Лош линк</title><link>javascript:alert(1)</link></item>
</channel></rss>`

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <title type="html">Claude &amp; Gemini</title>
  <link rel="replies" href="https://primer.mk/x#comments"/><link rel="alternate" href="https://primer.mk/x"/>
  <updated>2026-11-01T08:00:00Z</updated><summary>Споредба на чет-ботови</summary>
</entry></feed>`

describe('feed parser', () => {
  it('parses RSS with CDATA, entities and HTML descriptions', () => {
    const items = parseFeed(RSS)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      title: 'OpenAI објави нов модел за „македонски“',
      url: 'https://primer.mk/openai-model/',
      summary: 'Новиот модел подобро разбира текст.',
      published_at: '2026-11-02T08:30:00.000Z',
    })
    expect(items[1].published_at).toBeNull()
  })

  it('parses Atom and prefers the alternate link', () => {
    expect(parseFeed(ATOM)[0]).toMatchObject({ title: 'Claude & Gemini', url: 'https://primer.mk/x', published_at: '2026-11-01T08:00:00.000Z' })
  })

  it('strips markup safely', () => {
    expect(toText('&lt;b&gt;x&lt;/b&gt; <i>y</i>')).toBe('x y')
  })
})

describe('AI topic filter', () => {
  it.each([
    ['OpenAI објави нов модел', true],
    ['Вештачката интелигенција во образованието', true],
    ['Нов AI асистент', true],
    ['Што е машинско учење', true],
    ['Нов телефон на пазарот', false],
    ['Таи-кон-до турнир во Скопје', false],
    ['Raiffeisen банка со нова апликација', false],
  ])('%s → %s', (text, expected) => expect(isAiRelated(text)).toBe(expected))
})
