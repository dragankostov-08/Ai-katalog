import { BookOpen } from 'lucide-react'

function hash(text: string) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) >>> 0
  return value
}

const GRADIENTS = [
  'linear-gradient(135deg,#ede9fe 0%,#dbeafe 100%)',
  'linear-gradient(135deg,#e0f2fe 0%,#dcfce7 100%)',
  'linear-gradient(135deg,#fce7f3 0%,#ede9fe 100%)',
  'linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%)',
]

/** Illustrated fallback cover for guides without an image. Deterministic per slug. */
export function TypographicCover({ slug, title, label, size = 'md' }: { slug: string; title: string; label?: string; size?: 'md' | 'lg' }) {
  const background = GRADIENTS[hash(slug) % GRADIENTS.length]
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-2xl ${size === 'lg' ? 'aspect-[16/9] md:aspect-[16/7]' : 'aspect-[16/9]'}`} style={{ backgroundImage: background }}>
      <span className="absolute top-3 left-3 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-tomato-ink backdrop-blur">{label ?? 'Водич'}</span>
      <BookOpen className="absolute right-[8%] bottom-[12%] h-1/3 w-1/3 text-white/80" strokeWidth={1.2} />
      <p className={`absolute right-1/3 bottom-4 left-4 line-clamp-3 font-extrabold tracking-tight text-ink/80 ${size === 'lg' ? 'text-2xl md:text-4xl' : 'text-lg'}`}>{title}</p>
    </div>
  )
}
