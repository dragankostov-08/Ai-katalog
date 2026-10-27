import { Link } from 'react-router'

interface SymbolProps {
  className?: string
  title?: string
}

/**
 * The AI KATALOG symbol: a catalogue index card with a clipped corner and a
 * tab, struck by a printer's registration mark.
 */
export function LogoSymbol({ className = 'h-9 w-9', title }: SymbolProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect x="9" y="5.5" width="10" height="4.5" fill="var(--color-ink)" />
      <path d="M5.5 10h22.5l6.5 6.5V34.5h-29z" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinejoin="miter" />
      <path d="M28 10v6.5h6.5" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M10.5 20.5h13M10.5 25.5h8" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="square" />
      <circle cx="30" cy="30" r="5.5" fill="none" stroke="var(--color-tomato)" strokeWidth="2" />
      <path d="M30 21.5v17M21.5 30h17" stroke="var(--color-tomato)" strokeWidth="1.5" />
    </svg>
  )
}

export function Wordmark({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display leading-none ${className}`}>
      <span className={`px-1.5 py-1 text-[0.95em] font-black tracking-tight ${inverse ? 'bg-paper text-ink' : 'bg-ink text-paper'}`}>AI</span>
      <span className={`text-[1.05em] font-black tracking-[-0.03em] ${inverse ? 'text-paper' : 'text-ink'}`}>KATALOG</span>
    </span>
  )
}

export function Logo({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link to="/" className={`group inline-flex items-center gap-2 ${className}`} aria-label="AI KATALOG — почетна страница">
      <LogoSymbol className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6 md:h-9 md:w-9" />
      <Wordmark className="text-lg md:text-xl" inverse={inverse} />
    </Link>
  )
}
