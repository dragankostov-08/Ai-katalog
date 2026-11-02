import { Link } from 'react-router'

interface SymbolProps {
  className?: string
  title?: string
}

/** Monochrome brand tile with a stylised catalogue card and a spark. */
export function LogoSymbol({ className = 'h-9 w-9', title }: SymbolProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="40" height="40" rx="11" fill="#f4f4f7" />
      <rect x="9" y="11" width="18" height="20" rx="3.5" fill="#07070a" opacity="0.18" />
      <rect x="12" y="9" width="18" height="20" rx="3.5" fill="#07070a" />
      <path d="M16 15.5h10M16 19.5h7" stroke="#f4f4f7" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M29 23.5l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#07070a" stroke="#f4f4f7" strokeWidth="0.8" />
    </svg>
  )
}

export function Wordmark({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1 leading-none font-semibold tracking-tight ${className}`}>
      <span className={inverse ? 'text-white' : 'text-ink'}>AI</span>
      <span className={inverse ? 'text-white/60' : 'text-graphite'}>Katalog</span>
    </span>
  )
}

export function Logo({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link to="/" className={`group inline-flex shrink-0 items-center gap-2 ${className}`} aria-label="AI Katalog — почетна страница">
      <LogoSymbol className="h-8 w-8 transition-transform duration-300 group-hover:scale-105 md:h-9 md:w-9" />
      <Wordmark className="text-lg md:text-xl" inverse={inverse} />
    </Link>
  )
}
