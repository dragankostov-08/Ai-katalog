import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

interface PaginationProps {
  page: number
  totalPages: number
  hrefForPage: (page: number) => string
}

function pageWindow(page: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}

export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null
  const linkClass = 'inline-flex h-10 min-w-10 items-center justify-center border px-3 font-mono text-sm'
  return (
    <nav aria-label="Страници" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link to={hrefForPage(page - 1)} className={`${linkClass} border-ink/30 hover:border-ink`} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="sr-only md:not-sr-only md:ml-1">Претходна</span>
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 font-mono text-graphite" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={item}
            to={hrefForPage(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Страница ${item}`}
            className={`${linkClass} ${item === page ? 'border-ink bg-ink text-paper' : 'border-ink/30 hover:border-ink'}`}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link to={hrefForPage(page + 1)} className={`${linkClass} border-ink/30 hover:border-ink`} rel="next">
          <span className="sr-only md:not-sr-only md:mr-1">Следна</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  )
}
