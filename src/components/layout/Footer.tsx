import { Link, useRouteLoaderData } from 'react-router'
import { openConsentPreferences } from '../../lib/consent'
import type { SiteData } from '../../lib/types'
import { Logo } from '../brand/Logo'
import { footerNav } from './nav'

export function Footer() {
  const site = useRouteLoaderData('root') as SiteData | undefined
  const publisher = site?.settings.publisher_name
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-light">
            Каталог на AI алатки на македонски јазик: што прават, колку чинат и како да ги користиш паметно.
          </p>
          {publisher ? <p className="mt-3 font-mono text-xs text-light">Издавач: {publisher}</p> : null}
        </div>
        {footerNav.map((group) => (
          <div key={group.title}>
            <h2 className="label-mono mb-3 text-mustard">{group.title}</h2>
            <ul className="space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-cream/90 hover:text-white hover:underline hover:decoration-tomato hover:underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-cream/15">
        <div className="container-page flex flex-col gap-3 py-5 font-mono text-xs text-light md:flex-row md:items-center md:justify-between">
          <p>© {year} AI KATALOG</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link to="/privatnost" className="hover:text-white">
                Приватност
              </Link>
            </li>
            <li>
              <Link to="/uslovi" className="hover:text-white">
                Услови за користење
              </Link>
            </li>
            <li>
              <Link to="/kolacinja" className="hover:text-white">
                Колачиња
              </Link>
            </li>
            <li>
              <button type="button" onClick={openConsentPreferences} className="underline-offset-2 hover:text-white hover:underline">
                Поставки за приватност
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
