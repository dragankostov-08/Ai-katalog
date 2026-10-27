import { createLocalStore } from './store'

const MAX_FAVORITES = 200

const store = createLocalStore<string[]>('aik-favorites', [], (value) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v)).slice(0, MAX_FAVORITES) : null,
)

export const useFavorites = store.useValue

export function toggleFavorite(slug: string): boolean {
  const current = store.read()
  const exists = current.includes(slug)
  store.write(exists ? current.filter((s) => s !== slug) : [slug, ...current].slice(0, MAX_FAVORITES))
  return !exists
}

export function clearFavorites() {
  store.write([])
}
