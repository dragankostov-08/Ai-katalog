import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface SectionHeaderProps {
  index?: string
  title: ReactNode
  description?: ReactNode
  link?: { to: string; label: string }
  id?: string
  as?: 'h2' | 'h1'
}

export function SectionHeader({ index, title, description, link, id, as: Heading = 'h2' }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        {index ? <p className="mb-1 text-sm font-semibold text-tomato-ink">{index}</p> : null}
        <Heading id={id} className="text-2xl font-extrabold tracking-tight md:text-[1.75rem]">
          {title}
        </Heading>
        {description ? <p className="mt-1 text-graphite">{description}</p> : null}
      </div>
      {link ? (
        <Link to={link.to} className="group inline-flex items-center gap-1 text-sm font-semibold text-tomato-ink hover:text-tomato">
          {link.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
