import { Bookmark, Menu, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Form, Link, NavLink, useLocation, useRouteLoaderData } from 'react-router'
import { useFavorites } from '../../lib/favorites'
import type { SiteData } from '../../lib/types'
import { Logo } from '../brand/Logo'
import { CategoryIcon } from '../catalog/CategoryIcon'
import { MobileMenu } from './MobileMenu'
import { primaryNav } from './nav'

function HeaderSearch({ id, autoFocus }: { id: string; autoFocus?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])
  return (
    <Form action="/alatki" method="get" role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Пребарај AI алатки
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-mid" aria-hidden />
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        placeholder="Пребарај алатки…"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className="h-11 w-full rounded-full border border-light bg-paper pr-4 pl-10 text-sm placeholder:text-mid focus:border-tomato focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-soft"
      />
    </Form>
  )
}

/** Horizontal strip of categories, like the tabs of a directory. */
function CategoryStrip() {
  const site = useRouteLoaderData('root') as SiteData | undefined
  const categories = (site?.categories ?? []).filter((category) => category.tool_count > 0)
  if (!categories.length) return null
  return (
    <nav aria-label="Категории" className="border-t border-light/70">
      <ul className="container-page scrollbar-none flex gap-1 overflow-x-auto py-2">
        <li>
          <NavLink
            to="/alatki"
            end
            className={({ isActive }) =>
              `inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap ${isActive ? 'bg-ink text-white' : 'text-graphite hover:bg-cream hover:text-ink'}`
            }
          >
            Сите алатки
          </NavLink>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink
              to={`/kategorii/${category.slug}`}
              className={({ isActive }) =>
                `inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap ${isActive ? 'bg-ink text-white' : 'text-graphite hover:bg-cream hover:text-ink'}`
              }
            >
              <CategoryIcon name={category.icon} className="h-3.5 w-3.5" />
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const favorites = useFavorites()

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname, location.search])

  return (
    <header className="sticky top-0 z-40 border-b border-light bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-16 items-center gap-4 lg:gap-6">
        <Logo />

        <div className="hidden max-w-xl flex-1 md:block">
          <HeaderSearch id="header-search" />
        </div>

        <nav aria-label="Главна навигација" className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-brand-soft text-tomato-ink' : 'text-graphite hover:bg-cream hover:text-ink'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/omileni"
          className="relative hidden h-10 w-10 items-center justify-center rounded-full text-graphite hover:bg-cream hover:text-ink lg:inline-flex"
          aria-label={`Омилени${favorites.length ? ` (${favorites.length})` : ''}`}
        >
          <Bookmark className="h-5 w-5" aria-hidden />
          {favorites.length ? (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-tomato px-1 text-[0.625rem] font-bold text-white">
              {favorites.length}
            </span>
          ) : null}
        </Link>

        <Link to="/pronajdi" className="hidden h-10 items-center gap-1.5 rounded-full bg-tomato px-4 text-sm font-semibold text-white shadow-sm hover:bg-tomato-ink lg:inline-flex">
          <Sparkles className="h-4 w-4" aria-hidden />
          Пронајди алатка
        </Link>

        <div className="ml-auto flex items-center gap-1 md:ml-0 xl:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream md:hidden"
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{searchOpen ? 'Затвори пребарување' : 'Пребарај'}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-light bg-white px-3.5 text-sm font-semibold hover:bg-paper"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
            Мени
          </button>
        </div>
      </div>

      <div id="mobile-search" hidden={!searchOpen} className="border-t border-light px-4 py-3 md:hidden">
        <HeaderSearch id="mobile-header-search" autoFocus={searchOpen} />
      </div>

      <CategoryStrip />

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
