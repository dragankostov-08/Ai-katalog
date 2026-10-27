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
    <div className="mb-6 border-t-2 border-ink pt-3 md:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          {index ? <p className="label-mono mb-2 text-tomato-ink">{index}</p> : null}
          <Heading id={id} className="font-display text-[1.75rem] leading-[1.05] font-extrabold tracking-[-0.02em] md:text-[2.25rem]">
            {title}
          </Heading>
          {description ? <p className="mt-2 text-graphite">{description}</p> : null}
        </div>
        {link ? (
          <Link
            to={link.to}
            className="group inline-flex items-center gap-1.5 border-b border-ink pb-0.5 text-sm font-medium hover:border-tomato"
          >
            {link.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
