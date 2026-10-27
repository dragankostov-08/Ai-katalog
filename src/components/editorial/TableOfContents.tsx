import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const elements = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  const list = (
    <ol className="space-y-1.5 text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? 'pl-4' : ''}>
          <a
            href={`#${heading.id}`}
            aria-current={active === heading.id ? 'location' : undefined}
            className={`block border-l-2 py-0.5 pl-3 leading-snug transition-colors hover:text-ink ${
              active === heading.id ? 'border-tomato font-medium text-ink' : 'border-transparent text-graphite'
            }`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  )

  return (
    <>
      <details className="mb-8 border border-ink/30 bg-white lg:hidden">
        <summary className="cursor-pointer px-4 py-3 label-mono">Содржина на водичот</summary>
        <nav aria-label="Содржина" className="border-t border-ink/20 px-4 py-3">
          {list}
        </nav>
      </details>
      <nav aria-label="Содржина" className="sticky top-24 hidden lg:block">
        <p className="label-mono mb-3 text-graphite">Содржина</p>
        {list}
      </nav>
    </>
  )
}
