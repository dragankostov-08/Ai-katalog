import { Bookmark } from 'lucide-react'
import { toggleFavorite, useFavorites } from '../../lib/favorites'

export function FavoriteButton({ slug, name, withLabel, className = '' }: { slug: string; name: string; withLabel?: boolean; className?: string }) {
  const favorites = useFavorites()
  const saved = favorites.includes(slug)
  const label = saved ? `Отстрани ${name} од омилени` : `Зачувај ${name} во омилени`

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(slug)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-sm transition-colors ${
        withLabel ? 'h-10 border border-ink px-3 text-sm font-medium hover:bg-cream' : 'h-9 w-9 hover:bg-cream'
      } ${className}`}
    >
      <Bookmark className={`h-[18px] w-[18px] ${saved ? 'fill-tomato text-tomato-ink' : ''}`} aria-hidden strokeWidth={1.75} />
      {withLabel ? <span>{saved ? 'Зачувано' : 'Зачувај'}</span> : null}
    </button>
  )
}
