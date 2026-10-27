import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { slugify } from './slug'

/*
 * A small, deliberately limited Markdown dialect for editorial content.
 * It never renders raw HTML: the output is built from React elements, so
 * stored content cannot inject scripts or markup.
 *
 * Blocks: ## headings, paragraphs, - / 1. lists, > quotes, ``` code,
 * | tables |, ![alt](https://… "caption"), ---, and callouts:
 *   :::napomena | :::sovet | :::upozorduvanje | :::mislenje | :::sponzorirano
 *   …content…
 *   :::
 * Inline: **bold**, *italic*, `code`, [text](/internal or https://external).
 */

export type CalloutVariant = 'napomena' | 'sovet' | 'upozorduvanje' | 'mislenje' | 'sponzorirano'

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; code: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'image'; alt: string; url: string; caption?: string }
  | { type: 'callout'; variant: CalloutVariant; blocks: Block[] }
  | { type: 'hr' }

export const calloutLabels: Record<CalloutVariant, string> = {
  napomena: 'Напомена',
  sovet: 'Совет',
  upozorduvanje: 'Внимание',
  mislenje: 'Уредничко мислење',
  sponzorirano: 'Спонзорирана содржина',
}

const CALLOUTS = Object.keys(calloutLabels) as CalloutVariant[]

const RE = {
  fence: /^```/,
  callout: /^:::\s*([a-z]+)\s*$/,
  calloutEnd: /^:::\s*$/,
  heading: /^(#{1,4})\s+(.+?)\s*#*\s*$/,
  hr: /^(-{3,}|\*{3,}|_{3,})\s*$/,
  image: /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)\s*$/,
  tableSep: /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/,
  quote: /^>\s?(.*)$/,
  ul: /^[-*]\s+(.*)$/,
  ol: /^\d+[.)]\s+(.*)$/,
}

function isBlockStart(line: string, next?: string): boolean {
  return (
    RE.fence.test(line) ||
    RE.callout.test(line) ||
    RE.heading.test(line) ||
    RE.hr.test(line) ||
    RE.image.test(line) ||
    RE.quote.test(line) ||
    RE.ul.test(line) ||
    RE.ol.test(line) ||
    (line.trimStart().startsWith('|') && next !== undefined && RE.tableSep.test(next))
  )
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim())
}

export function parseMarkdown(source: string, usedIds = new Map<string, number>()): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }

    if (RE.fence.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !RE.fence.test(lines[i])) code.push(lines[i++])
      i++
      blocks.push({ type: 'code', code: code.join('\n') })
      continue
    }

    const callout = line.match(RE.callout)
    if (callout && CALLOUTS.includes(callout[1] as CalloutVariant)) {
      const inner: string[] = []
      i++
      while (i < lines.length && !RE.calloutEnd.test(lines[i])) inner.push(lines[i++])
      i++
      blocks.push({ type: 'callout', variant: callout[1] as CalloutVariant, blocks: parseMarkdown(inner.join('\n'), usedIds) })
      continue
    }

    const heading = line.match(RE.heading)
    if (heading) {
      const level = Math.min(4, Math.max(2, heading[1].length)) as 2 | 3 | 4
      const text = heading[2]
      const base = slugify(stripInline(text)) || 'del'
      const seen = usedIds.get(base) ?? 0
      usedIds.set(base, seen + 1)
      blocks.push({ type: 'heading', level, text, id: seen ? `${base}-${seen + 1}` : base })
      i++
      continue
    }

    if (RE.hr.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    const image = line.match(RE.image)
    if (image) {
      blocks.push({ type: 'image', alt: image[1], url: image[2], caption: image[3] })
      i++
      continue
    }

    if (line.trimStart().startsWith('|') && i + 1 < lines.length && RE.tableSep.test(lines[i + 1])) {
      const head = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        const cells = splitRow(lines[i++])
        rows.push(head.map((_, index) => cells[index] ?? ''))
      }
      blocks.push({ type: 'table', head, rows })
      continue
    }

    if (RE.quote.test(line)) {
      const quote: string[] = []
      while (i < lines.length && RE.quote.test(lines[i])) quote.push(lines[i++].match(RE.quote)![1])
      blocks.push({ type: 'quote', text: quote.join(' ') })
      continue
    }

    const listMatch = line.match(RE.ul) ? RE.ul : line.match(RE.ol) ? RE.ol : null
    if (listMatch) {
      const items: string[] = []
      while (i < lines.length) {
        const current = lines[i]
        const item = current.match(listMatch)
        if (item) {
          items.push(item[1])
          i++
        } else if (/^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1] += ' ' + current.trim()
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'list', ordered: listMatch === RE.ol, items })
      continue
    }

    const paragraph: string[] = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) {
      paragraph.push(lines[i++].trim())
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}

/* ------------------------------------------------------------------------- */
/* Inline                                                                     */
/* ------------------------------------------------------------------------- */

const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s](?:[^*]*[^*\s])?)\*|(?<![\p{L}\p{N}])_([^_\s](?:[^_]*[^_\s])?)_(?![\p{L}\p{N}])/u

export function safeHref(url: string): { href: string; internal: boolean } | null {
  if (url.startsWith('/') && !url.startsWith('//')) return { href: url, internal: true }
  if (url.startsWith('#')) return { href: url, internal: false }
  if (/^https:\/\/[^\s]+$/i.test(url) || /^http:\/\/[^\s]+$/i.test(url)) return { href: url, internal: false }
  if (/^mailto:[^\s]+@[^\s]+$/i.test(url)) return { href: url, internal: false }
  return null
}

export function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let index = 0

  while (rest) {
    const match = INLINE.exec(rest)
    if (!match) {
      nodes.push(rest)
      break
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index))
    const key = `${keyPrefix}-${index++}`
    const [whole, code, bold, linkText, linkUrl, em, em2] = match

    if (code !== undefined) {
      nodes.push(<code key={key}>{code}</code>)
    } else if (bold !== undefined) {
      nodes.push(<strong key={key}>{renderInline(bold, key)}</strong>)
    } else if (linkText !== undefined) {
      const link = safeHref(linkUrl)
      if (!link) {
        nodes.push(linkText)
      } else if (link.internal) {
        nodes.push(
          <Link key={key} to={link.href}>
            {renderInline(linkText, key)}
          </Link>,
        )
      } else {
        nodes.push(
          <a key={key} href={link.href} rel="noopener noreferrer" target="_blank">
            {renderInline(linkText, key)}
          </a>,
        )
      }
    } else if (em !== undefined || em2 !== undefined) {
      nodes.push(<em key={key}>{renderInline(em ?? em2, key)}</em>)
    }
    rest = rest.slice(match.index + whole.length)
  }
  return nodes
}

/** Removes inline markup, e.g. for meta descriptions and heading ids. */
export function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(?<![\p{L}\p{N}])_([^_]+)_(?![\p{L}\p{N}])/gu, '$1')
}

export function toPlainText(source: string, maxLength = 200): string {
  const text = parseMarkdown(source)
    .flatMap((block) => {
      if (block.type === 'paragraph' || block.type === 'quote') return [block.text]
      if (block.type === 'list') return block.items
      return []
    })
    .map(stripInline)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…` : text
}

export function extractHeadings(blocks: Block[]) {
  return blocks
    .filter((block): block is Extract<Block, { type: 'heading' }> => block.type === 'heading' && block.level <= 3)
    .map((block) => ({ id: block.id, text: stripInline(block.text), level: block.level }))
}

/* ------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* ------------------------------------------------------------------------- */

const calloutStyles: Record<CalloutVariant, string> = {
  napomena: 'border-ink bg-white',
  sovet: 'border-teal bg-white',
  upozorduvanje: 'border-tomato bg-white',
  mislenje: 'border-mustard bg-cream/60',
  sponzorirano: 'border-raspberry bg-white',
}

function renderBlock(block: Block, key: string): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4'
      return (
        <Tag key={key} id={block.id}>
          {renderInline(block.text, key)}
        </Tag>
      )
    }
    case 'paragraph':
      return <p key={key}>{renderInline(block.text, key)}</p>
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag key={key}>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item, `${key}-${index}`)}</li>
          ))}
        </Tag>
      )
    }
    case 'quote':
      return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>
    case 'code':
      return (
        <pre key={key} tabIndex={0}>
          <code>{block.code}</code>
        </pre>
      )
    case 'table':
      return (
        <div key={key} className="table-wrap" role="region" aria-label="Табела" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index} scope="col">
                    {renderInline(cell, `${key}-h${index}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'image':
      return (
        <figure key={key}>
          <img src={block.url} alt={block.alt} loading="lazy" decoding="async" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      )
    case 'callout':
      return (
        <aside key={key} className={`border-l-4 px-4 py-3 not-italic ${calloutStyles[block.variant]}`}>
          <p className="label-mono mb-1 text-graphite">{calloutLabels[block.variant]}</p>
          <div className="space-y-3 [&>*]:mt-0">{block.blocks.map((inner, index) => renderBlock(inner, `${key}-${index}`))}</div>
        </aside>
      )
    case 'hr':
      return <hr key={key} />
  }
}

interface MarkdownProps {
  source?: string
  blocks?: Block[]
  className?: string
  /** Element inserted before the n-th second-level heading (e.g. an ad slot). */
  insert?: { beforeHeading: number; node: ReactNode }
}

export function Markdown({ source = '', blocks, className = 'prose-ak', insert }: MarkdownProps) {
  const parsed = blocks ?? parseMarkdown(source)
  let h2Count = 0
  let inserted = false

  const children = parsed.map((block, index) => {
    const element = renderBlock(block, `b${index}`)
    if (insert && block.type === 'heading' && block.level === 2) {
      h2Count++
      if (h2Count === insert.beforeHeading && !inserted) {
        inserted = true
        return (
          <Fragment key={`b${index}`}>
            <div className="not-prose">{insert.node}</div>
            {element}
          </Fragment>
        )
      }
    }
    return element
  })

  return <div className={className}>{children}</div>
}
