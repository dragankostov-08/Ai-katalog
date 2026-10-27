import type { SearchParams } from './api'
import { PLATFORMS, type PricingType } from './types'

export const PAGE_SIZE = 24

export const SORT_OPTIONS = [
  { value: 'izbor', label: 'Избор на уредништвото', api: 'featured' },
  { value: 'novi', label: 'Најново додадени', api: 'recent' },
  { value: 'abc', label: 'Азбучно (А–Ш)', api: 'name' },
  { value: 'relevantnost', label: 'Најрелевантни', api: 'relevance' },
] as const

export const PRICING_FILTERS: PricingType[] = ['free', 'freemium', 'paid', 'free_trial', 'open_source']

export interface DirectoryFilters {
  q: string
  kategorija: string
  namena: string
  cena: PricingType[]
  besplatno: boolean
  platforma: string
  sort: string
  strana: number
}

export function parseDirectoryParams(search: URLSearchParams): DirectoryFilters {
  const page = Number.parseInt(search.get('strana') ?? '1', 10)
  const platform = search.get('platforma') ?? ''
  const sort = search.get('sort') ?? ''
  return {
    q: (search.get('q') ?? '').slice(0, 100),
    kategorija: (search.get('kategorija') ?? '').slice(0, 80),
    namena: (search.get('namena') ?? '').slice(0, 80),
    cena: (search.get('cena') ?? '')
      .split(',')
      .filter((value): value is PricingType => (PRICING_FILTERS as string[]).includes(value)),
    besplatno: search.get('besplatno') === '1',
    platforma: (PLATFORMS as readonly string[]).includes(platform) ? platform : '',
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : '',
    strana: Number.isFinite(page) && page > 0 ? Math.min(page, 200) : 1,
  }
}

export function toSearchParams(filters: Partial<DirectoryFilters>): URLSearchParams {
  const search = new URLSearchParams()
  if (filters.q) search.set('q', filters.q)
  if (filters.kategorija) search.set('kategorija', filters.kategorija)
  if (filters.namena) search.set('namena', filters.namena)
  if (filters.cena?.length) search.set('cena', filters.cena.join(','))
  if (filters.besplatno) search.set('besplatno', '1')
  if (filters.platforma) search.set('platforma', filters.platforma)
  if (filters.sort) search.set('sort', filters.sort)
  if (filters.strana && filters.strana > 1) search.set('strana', String(filters.strana))
  return search
}

export function toApiParams(filters: DirectoryFilters, category?: string): SearchParams {
  const sort = SORT_OPTIONS.find((option) => option.value === filters.sort)?.api
  return {
    query: filters.q || undefined,
    category: category ?? (filters.kategorija || undefined),
    useCase: filters.namena || undefined,
    pricing: filters.cena,
    freePlan: filters.besplatno,
    platform: filters.platforma || undefined,
    sort,
    limit: PAGE_SIZE,
    offset: (filters.strana - 1) * PAGE_SIZE,
  }
}

/** Filtered views are useful for visitors but too thin to be indexed. */
export function hasIndexableParams(filters: DirectoryFilters): boolean {
  return !filters.q && !filters.kategorija && !filters.namena && !filters.cena.length && !filters.besplatno && !filters.platforma && !filters.sort
}

export function activeFilterCount(filters: DirectoryFilters): number {
  return (
    (filters.kategorija ? 1 : 0) +
    (filters.namena ? 1 : 0) +
    filters.cena.length +
    (filters.besplatno ? 1 : 0) +
    (filters.platforma ? 1 : 0)
  )
}
