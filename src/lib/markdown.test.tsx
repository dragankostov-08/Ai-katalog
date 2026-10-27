import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { extractHeadings, Markdown, parseMarkdown, safeHref, toPlainText } from './markdown'

const html = (source: string) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Markdown source={source} />
    </MemoryRouter>,
  )

describe('parseMarkdown', () => {
  it('parses headings with transliterated, unique ids', () => {
    const blocks = parseMarkdown('## Што е промпт\n\nТекст\n\n## Што е промпт')
    expect(extractHeadings(blocks)).toEqual([
      { id: 'shto-e-prompt', text: 'Што е промпт', level: 2 },
      { id: 'shto-e-prompt-2', text: 'Што е промпт', level: 2 },
    ])
  })

  it('parses lists, tables, code, quotes and callouts', () => {
    const blocks = parseMarkdown(
      ['- една', '- две', '', '1. прво', '', '| А | Б |', '| --- | --- |', '| 1 | 2 |', '', '```', 'код', '```', '', '> цитат', '', ':::sovet', 'Совет **важен**', ':::'].join('\n'),
    )
    expect(blocks.map((b) => b.type)).toEqual(['list', 'list', 'table', 'code', 'quote', 'callout'])
    expect(blocks[2]).toMatchObject({ head: ['А', 'Б'], rows: [['1', '2']] })
  })

  it('treats a bare # heading as h2 because h1 belongs to the page', () => {
    expect(parseMarkdown('# Наслов')[0]).toMatchObject({ type: 'heading', level: 2 })
  })
})

describe('Markdown rendering is safe', () => {
  it('never renders raw HTML', () => {
    const output = html('<script>alert(1)</script> <img src=x onerror=alert(1)>')
    expect(output).not.toContain('<script>')
    expect(output).not.toContain('<img')
    expect(output).toContain('&lt;script&gt;')
  })

  it('drops javascript: links and keeps the text', () => {
    const output = html('[клик](javascript:alert(1))')
    expect(output).not.toContain('href')
    expect(output).toContain('клик')
  })

  it('renders internal links as router links and external links with rel', () => {
    const output = html('[алатка](/alatka/chatgpt) и [надвор](https://example.com)')
    expect(output).toContain('href="/alatka/chatgpt"')
    expect(output).toContain('rel="noopener noreferrer"')
  })

  it('only allows https images', () => {
    expect(parseMarkdown('![опис](http://example.com/a.png)')[0].type).toBe('paragraph')
    expect(parseMarkdown('![опис](https://example.com/a.png "Потпис")')[0]).toMatchObject({ type: 'image', caption: 'Потпис' })
  })

  it('inserts a node before the n-th h2', () => {
    const output = renderToStaticMarkup(
      <MemoryRouter>
        <Markdown source={'## А\n\nx\n\n## Б\n\ny'} insert={{ beforeHeading: 2, node: <span>РЕКЛАМА</span> }} />
      </MemoryRouter>,
    )
    expect(output.indexOf('РЕКЛАМА')).toBeLessThan(output.indexOf('id="b"'))
    expect(output.indexOf('РЕКЛАМА')).toBeGreaterThan(output.indexOf('id="a"'))
  })
})

describe('helpers', () => {
  it('safeHref', () => {
    expect(safeHref('/vodici')).toEqual({ href: '/vodici', internal: true })
    expect(safeHref('//evil.com')).toBeNull()
    expect(safeHref('data:text/html,x')).toBeNull()
    expect(safeHref('mailto:a@b.mk')).toEqual({ href: 'mailto:a@b.mk', internal: false })
  })

  it('toPlainText strips markup and truncates on a word boundary', () => {
    expect(toPlainText('**Задебелено** и [линк](/x).')).toBe('Задебелено и линк.')
    expect(toPlainText('збор '.repeat(100), 30).length).toBeLessThanOrEqual(30)
  })
})
