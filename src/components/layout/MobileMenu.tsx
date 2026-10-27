import { NavLink, useRouteLoaderData } from 'react-router'
import type { SiteData } from '../../lib/types'
import { CategoryIcon } from '../catalog/CategoryIcon'
import { ButtonLink } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { primaryNav } from './nav'

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const site = useRouteLoaderData('root') as SiteData | undefined
  const categories = (site?.categories ?? []).filter((category) => category.tool_count > 0)

  return (
    <Dialog open={open} onClose={onClose} title="Мени" placement="right">
      <nav aria-label="Мобилна навигација">
        <ul className="divide-y divide-ink/15 border-y border-ink/15">
          {primaryNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `block py-3 font-display text-2xl font-extrabold ${isActive ? 'text-tomato-ink' : 'text-ink'}`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <ButtonLink to="/pronajdi" variant="accent" size="lg" className="mt-5 w-full">
          Пронајди алатка за твојата задача
        </ButtonLink>
        {categories.length ? (
          <>
            <p className="label-mono mt-8 mb-2 text-graphite">Категории</p>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category.slug}>
                  <NavLink to={`/kategorii/${category.slug}`} className="flex items-center gap-2 py-1.5 text-[0.95rem] hover:text-tomato-ink">
                    <CategoryIcon name={category.icon} />
                    {category.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <ul className="mt-8 space-y-2 border-t border-ink/15 pt-4 text-sm">
          <li>
            <NavLink to="/predlozi" className="hover:underline">
              Предложи алатка
            </NavLink>
          </li>
          <li>
            <NavLink to="/omileni" className="hover:underline">
              Омилени алатки
            </NavLink>
          </li>
          <li>
            <NavLink to="/za-nas" className="hover:underline">
              За нас
            </NavLink>
          </li>
          <li>
            <NavLink to="/kontakt" className="hover:underline">
              Контакт
            </NavLink>
          </li>
        </ul>
      </nav>
    </Dialog>
  )
}
