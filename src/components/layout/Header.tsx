import { Bookmark, Menu, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Form, Link, NavLink, useLocation } from 'react-router'
import { useFavorites } from '../../lib/favorites'
import { Logo } from '../brand/Logo'
import { ButtonLink } from '../ui/Button'
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
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-graphite" aria-hidden />
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        placeholder="Пребарај алатки…"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className="h-10 w-full rounded-xs border border-ink/40 bg-white pr-3 pl-9 text-sm placeholder:text-graphite focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-tomato"
      />
    </Form>
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
    <header className="sticky top-0 z-40 border-b border-ink bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
      <div className="hidden border-b border-ink/15 md:block">
        <div className="container-page flex h-8 items-center justify-between label-mono text-graphite">
          <span>Независен каталог на AI алатки · на македонски</span>
          <span className="flex items-center gap-5">
            <Link to="/predlozi" className="hover:text-ink">
              Предложи алатка
            </Link>
            <Link to="/omileni" className="inline-flex items-center gap-1 hover:text-ink">
              <Bookmark className="h-3 w-3" aria-hidden /> Омилени{favorites.length ? ` (${favorites.length})` : ''}
            </Link>
          </span>
        </div>
      </div>

      <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
        <Logo />

        <nav aria-label="Главна навигација" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative px-2.5 py-2 text-[0.95rem] font-medium transition-colors hover:text-tomato-ink ${
                      isActive ? 'text-ink after:absolute after:inset-x-2.5 after:-bottom-[1px] after:h-[3px] after:bg-tomato' : 'text-graphite'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden w-full max-w-64 md:block xl:max-w-72">
          <HeaderSearch id="header-search" />
        </div>

        <div className="hidden shrink-0 lg:block">
          <ButtonLink to="/pronajdi" variant="accent" size="md">
            Пронајди алатка
          </ButtonLink>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0 lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm hover:bg-cream md:hidden"
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{searchOpen ? 'Затвори пребарување' : 'Пребарај'}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink px-3 text-sm font-medium hover:bg-cream"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
            Мени
          </button>
        </div>
      </div>

      <div id="mobile-search" hidden={!searchOpen} className="border-t border-ink/15 px-4 py-3 md:hidden">
        <HeaderSearch id="mobile-header-search" autoFocus={searchOpen} />
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
