import { Link, useRouteLoaderData } from 'react-router'
import { openConsentPreferences } from '../../lib/consent'
import type { SiteData } from '../../lib/types'
import { Logo } from '../brand/Logo'
import { footerNav } from './nav'

export function Footer() {
  const site = useRouteLoaderData('root') as SiteData | undefined
  const publisher = site?.settings.publisher_name
  const year = new Date().getFullYear()
  const settings = site?.settings ?? {}
  const socials = (
    [
      ['Viber', settings.viber_url],
      ['Telegram', settings.telegram_url],
      ['Instagram', settings.instagram_url],
      ['Facebook', settings.facebook_url],
      ['TikTok', settings.tiktok_url],
      ['YouTube', settings.youtube_url],
      ['LinkedIn', settings.linkedin_url],
    ] as const
  )
    .filter(([, url]) => url)
    .map(([label, url]) => ({ label, url: url as string }))

  return (
    <footer className="mt-24 border-t border-light bg-surface text-graphite">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-graphite">
            Каталог на AI алатки на македонски јазик: што прават, колку чинат и како да ги користиш паметно.
          </p>
          {publisher ? <p className="mt-3 text-xs text-mid">Издавач: {publisher}</p> : null}
          {socials.length ? (
            <ul className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="Следи нè">
              {socials.map((social) => (
                <li key={social.label}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer me" className="inline-flex rounded-full border border-light px-3 py-1 text-graphite hover:border-white/20 hover:bg-brand-soft hover:text-tomato-ink">
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {footerNav.map((group) => (
          <div key={group.title}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{group.title}</h2>
            <ul className="space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-graphite hover:text-tomato-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-light">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-mid md:flex-row md:items-center md:justify-between">
          <p>© {year} AI KATALOG</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link to="/privatnost" className="hover:text-ink">
                Приватност
              </Link>
            </li>
            <li>
              <Link to="/uslovi" className="hover:text-ink">
                Услови за користење
              </Link>
            </li>
            <li>
              <Link to="/kolacinja" className="hover:text-ink">
                Колачиња
              </Link>
            </li>
            <li>
              <button type="button" onClick={openConsentPreferences} className="underline-offset-2 hover:text-ink hover:underline">
                Поставки за приватност
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
