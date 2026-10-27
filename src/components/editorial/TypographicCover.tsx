import { accentClasses } from '../../lib/labels'

function hash(text: string) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0
  return value
}

const ACCENTS = ['tomato', 'mustard', 'teal', 'raspberry'] as const

/**
 * Editorial fallback cover for guides without a photograph: halftone print,
 * one accent strip and a typographic fragment. Deterministic per slug.
 */
export function TypographicCover({ slug, title, label, size = 'md' }: { slug: string; title: string; label?: string; size?: 'md' | 'lg' }) {
  const h = hash(slug)
  const accent = ACCENTS[h % ACCENTS.length]
  const flip = h % 2 === 0
  // The longest word is usually the most distinctive one in a Macedonian title.
  const word = title.split(/[\s:—,.!?„“"]+/).reduce((longest, w) => (w.length > longest.length ? w : longest), '')

  return (
    <div aria-hidden className={`relative overflow-hidden border border-ink bg-cream ${size === 'lg' ? 'aspect-[4/3] md:aspect-[16/8]' : 'aspect-[16/10]'}`}>
      <div className={`absolute top-[-18%] h-[85%] aspect-square rounded-full halftone-coarse opacity-90 ${flip ? 'right-[-12%]' : 'left-[-12%]'}`} style={{ maskImage: 'radial-gradient(circle, black 40%, transparent 72%)' }} />
      <div className={`absolute bottom-[18%] h-[14%] w-[62%] ${accentClasses[accent]} ${flip ? 'left-0' : 'right-0'}`} />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-paper torn-edge-y" style={{ transform: 'scaleY(-1)' }} />
      <span className="absolute top-3 left-3 bg-paper px-1.5 py-0.5 label-mono text-ink">{label ?? 'Водич'}</span>
      <span className={`absolute bottom-[6%] left-4 right-4 font-serif leading-[0.95] font-bold text-ink italic ${size === 'lg' ? 'text-5xl md:text-7xl' : 'text-4xl'} truncate`}>
        {word.toLowerCase()}
      </span>
      <svg className="absolute top-3 right-3 h-5 w-5 text-ink" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M10 0v20M0 10h20" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}
