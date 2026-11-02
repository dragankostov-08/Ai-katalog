import { createLocalStore } from './store'

export const MAX_COMPARE = 3

export interface CompareItem {
  slug: string
  name: string
}

const store = createLocalStore<CompareItem[]>('aik-compare', [], (value) =>
  Array.isArray(value)
    ? value
        .filter(
          (v): v is CompareItem =>
            !!v && typeof v === 'object' && typeof v.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(v.slug) && typeof v.name === 'string',
        )
        .map((v) => ({ slug: v.slug, name: v.name.slice(0, 120) }))
        .slice(0, MAX_COMPARE)
    : null,
)

export const useCompare = store.useValue

/** Returns false when the list is already full. */
export function toggleCompare(item: CompareItem): boolean {
  const current = store.read()
  if (current.some((c) => c.slug === item.slug)) {
    store.write(current.filter((c) => c.slug !== item.slug))
    return true
  }
  if (current.length >= MAX_COMPARE) return false
  store.write([...current, item])
  return true
}

export function setCompare(items: CompareItem[]) {
  store.write(items.slice(0, MAX_COMPARE))
}

export function clearCompare() {
  store.write([])
}

export const compareHref = (slugs: string[]) => `/sporedi?alatki=${slugs.join(',')}`
