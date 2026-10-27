import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigation, useSearchParams } from 'react-router'
import { activeFilterCount, PAGE_SIZE, parseDirectoryParams, SORT_OPTIONS, toSearchParams, type DirectoryFilters } from '../../lib/directory'
import { plural } from '../../lib/labels'
import type { CategorySummary, SearchResult, UseCase } from '../../lib/types'
import { AdSlot, type AdPlacement } from '../editorial/AdSlot'
import { Button, ButtonLink } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Pagination } from '../ui/Pagination'
import { EmptyState, ToolCardSkeleton } from '../ui/States'
import { ActiveFilterChips, FilterPanel } from './DirectoryFilters'
import { ToolCard } from './ToolCard'

interface ToolBrowserProps {
  filters: DirectoryFilters
  result: SearchResult
  categories: CategorySummary[]
  useCases: UseCase[]
  hideCategory?: boolean
  adPlacement?: AdPlacement
}

const SEARCH_DEBOUNCE_MS = 450

/** Search, filters, sorting, pagination and results — state lives in the URL. */
export function ToolBrowser({ filters: loadedFilters, result, categories, useCases, hideCategory, adPlacement = 'directory' }: ToolBrowserProps) {
  const [, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigation = useNavigation()
  // Show the requested filters immediately while their results load.
  const [optimistic, setOptimistic] = useState<DirectoryFilters | null>(null)
  const pendingSearch = navigation.location?.pathname === location.pathname ? navigation.location.search : null
  const filters = optimistic ?? (pendingSearch !== null ? parseDirectoryParams(new URLSearchParams(pendingSearch)) : loadedFilters)

  useEffect(() => setOptimistic(null), [loadedFilters])
  const [query, setQuery] = useState(filters.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const loading = navigation.state === 'loading' && navigation.location?.pathname === location.pathname
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  const activeCount = activeFilterCount(filters) - (hideCategory && filters.kategorija ? 1 : 0)

  useEffect(() => setQuery(filters.q), [filters.q])
  useEffect(() => () => clearTimeout(debounce.current), [])

  function update(patch: Partial<DirectoryFilters>, replace = false) {
    const next = { ...filters, ...patch }
    if (!('strana' in patch)) next.strana = 1
    // A relevance sort only makes sense while searching.
    if (!next.q && next.sort === 'relevantnost') next.sort = ''
    setOptimistic(next)
    setSearchParams(toSearchParams(next), { replace, preventScrollReset: true })
  }

  function onQueryChange(value: string) {
    setQuery(value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => update({ q: value.trim() }, true), SEARCH_DEBOUNCE_MS)
  }

  const hrefForPage = (page: number) => `${location.pathname}?${toSearchParams({ ...filters, strana: page }).toString()}`.replace(/\?$/, '')
  const clearAll = () => {
    setOptimistic(parseDirectoryParams(new URLSearchParams()))
    setSearchParams(new URLSearchParams(), { preventScrollReset: true })
  }

  const panel = <FilterPanel filters={filters} categories={categories} useCases={useCases} onChange={(patch) => update(patch)} hideCategory={hideCategory} />

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Филтри">
        <div className="sticky top-28">
          <h2 className="mb-3 font-display text-lg font-bold">Филтри</h2>
          {panel}
        </div>
      </aside>

      <div className="min-w-0">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            clearTimeout(debounce.current)
            update({ q: query.trim() })
          }}
          className="flex border-2 border-ink bg-white"
        >
          <label htmlFor="directory-search" className="sr-only">
            Пребарај алатки
          </label>
          <Search className="ml-3 h-5 w-5 shrink-0 self-center text-graphite" aria-hidden />
          <input
            id="directory-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Име, опис или клучен збор…"
            maxLength={100}
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
          />
          <button type="submit" className="m-1 shrink-0 bg-ink px-4 text-sm font-medium text-paper hover:bg-graphite">
            Барај
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 pb-3">
          <p className="font-mono text-sm" aria-live="polite">
            {loading ? 'Се вчитува…' : `${result.total} ${plural(result.total, 'резултат', 'резултати')}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Филтри{activeCount ? ` (${activeCount})` : ''}
            </Button>
            <label htmlFor="directory-sort" className="sr-only">
              Подреди
            </label>
            <select
              id="directory-sort"
              value={filters.sort || (filters.q ? 'relevantnost' : 'izbor')}
              onChange={(event) => update({ sort: event.target.value })}
              className="h-8 rounded-xs border border-ink/40 bg-white px-2 text-sm"
            >
              {SORT_OPTIONS.filter((option) => option.value !== 'relevantnost' || filters.q).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <ActiveFilterChips
            filters={filters}
            categories={categories}
            useCases={useCases}
            onChange={(patch) => update(patch)}
            onClear={clearAll}
            hideCategory={hideCategory}
          />
        </div>

        <div className="mt-6" aria-busy={loading}>
          {loading ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={index}>
                  <ToolCardSkeleton />
                </li>
              ))}
            </ul>
          ) : result.items.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-5">
              {result.items.map((tool, index) => (
                <li key={tool.id} className={index === 6 ? 'contents' : undefined}>
                  {index === 6 ? (
                    <>
                      <div className="sm:col-span-2 xl:col-span-3">
                        <AdSlot placement={adPlacement} />
                      </div>
                      <div>
                        <ToolCard tool={tool} />
                      </div>
                    </>
                  ) : (
                    <ToolCard tool={tool} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Нема алатки што одговараат"
              action={
                <>
                  <Button variant="secondary" onClick={clearAll}>
                    Исчисти ги филтрите
                  </Button>
                  <ButtonLink to="/predlozi">Предложи алатка</ButtonLink>
                </>
              }
            >
              Пробај со пократок збор, отстрани некој филтер или предложи ни алатка што недостасува.
            </EmptyState>
          )}
        </div>

        {!loading ? <Pagination page={filters.strana} totalPages={totalPages} hrefForPage={hrefForPage} /> : null}
      </div>

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Филтри"
        placement="right"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={clearAll}>
              Исчисти
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Прикажи {result.total}
            </Button>
          </div>
        }
      >
        {panel}
      </Dialog>
    </div>
  )
}
