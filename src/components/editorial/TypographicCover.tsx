import { BookOpen } from 'lucide-react'

/** Fallback cover for guides without an image: a quiet glass panel with a fine grid. */
export function TypographicCover({ title, label, size = 'md' }: { slug?: string; title: string; label?: string; size?: 'md' | 'lg' }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-2xl border border-light bg-surface ${size === 'lg' ? 'aspect-[16/9] md:aspect-[16/7]' : 'aspect-[16/9]'}`}
      style={{
        backgroundImage:
          'linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <span className="absolute top-3 left-3 rounded-full border border-light bg-paper/70 px-2.5 py-1 text-xs font-medium text-graphite">{label ?? 'Водич'}</span>
      <BookOpen className="absolute right-[8%] bottom-[14%] h-1/3 w-1/3 text-white/10" strokeWidth={1} />
      <p className={`absolute right-1/3 bottom-4 left-4 line-clamp-3 font-semibold tracking-tight text-ink ${size === 'lg' ? 'text-2xl md:text-4xl' : 'text-lg'}`}>{title}</p>
    </div>
  )
}
