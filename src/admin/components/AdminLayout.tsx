import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Columns3,
  ExternalLink,
  FolderTree,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Mail,
  Menu,
  Settings,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { LogoSymbol } from '../../components/brand/Logo'
import { getSupabase } from '../../lib/supabase'
import { useAdmin } from '../AdminApp'

const NAV = [
  { to: '/admin', label: 'Преглед', icon: LayoutDashboard, end: true },
  { to: '/admin/alatki', label: 'Алатки', icon: Wrench },
  { to: '/admin/kategorii', label: 'Категории и намени', icon: FolderTree },
  { to: '/admin/vodici', label: 'Водичи', icon: BookOpen },
  { to: '/admin/sporedbi', label: 'Споредби', icon: Columns3 },
  { to: '/admin/kolekcii', label: 'Листи', icon: ListOrdered },
  { to: '/admin/proverka', label: 'Проверка', icon: ClipboardCheck },
  { to: '/admin/predlozi', label: 'Предлози', icon: Inbox },
  { to: '/admin/poraki', label: 'Пораки', icon: Mail },
  { to: '/admin/analitika', label: 'Аналитика', icon: BarChart3 },
]

const ADMIN_NAV = [
  { to: '/admin/bilten', label: 'Билтен', icon: Mail },
  { to: '/admin/postavki', label: 'Поставки', icon: Settings },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const me = useAdmin()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  const items = me.role === 'admin' ? [...NAV, ...ADMIN_NAV] : NAV

  const nav = (
    <nav aria-label="Администрација">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={'end' in item}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xs px-3 py-2 text-sm ${isActive ? 'bg-paper font-medium text-ink' : 'text-cream/85 hover:bg-graphite hover:text-white'}`
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className={`${open ? 'fixed inset-0 z-40 block' : 'hidden'} bg-ink p-4 text-cream lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto`}>
        <div className="mb-6 flex items-center gap-2">
          <LogoSymbol className="h-7 w-7" />
          <span className="font-display font-black text-paper">AI KATALOG</span>
          <button type="button" className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Затвори мени">
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
        <div className="mt-8 border-t border-cream/20 pt-4 text-xs text-light">
          <p className="truncate">{me.email}</p>
          <p className="label-mono mt-1 text-mustard">{me.role === 'admin' ? 'Администратор' : 'Уредник'}</p>
          <Link to="/" className="mt-3 flex items-center gap-1.5 hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Јавен сајт
          </Link>
          <button type="button" onClick={() => getSupabase().auth.signOut()} className="mt-2 flex items-center gap-1.5 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Одјави се
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center gap-3 border-b border-ink bg-white px-4 py-2 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Отвори мени" className="p-1">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-black">Админ</span>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
