import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type FormEvent } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { LogoSymbol, Wordmark } from '../components/brand/Logo'
import { Button } from '../components/ui/Button'
import { isBackendConfigured } from '../lib/env'
import { applyHead } from '../lib/seo'
import { getSupabase } from '../lib/supabase'
import { adminApi, type AdminMe } from './api'
import { AdminLayout } from './components/AdminLayout'
import { controlClass, ErrorBox, ToastProvider, useAsync } from './components/ui'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ArticleEditor } from './pages/ArticleEditor'
import { CategoriesPage } from './pages/CategoriesPage'
import { CollectionEditor } from './pages/CollectionEditor'
import { ComparisonEditor } from './pages/ComparisonEditor'
import { DashboardPage } from './pages/DashboardPage'
import { ContentList } from './pages/ContentList'
import { MessagesPage } from './pages/MessagesPage'
import { NewsletterPage } from './pages/NewsletterPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { SettingsPage } from './pages/SettingsPage'
import { SubmissionsPage } from './pages/SubmissionsPage'
import { ToolEditor } from './pages/ToolEditor'

const AdminContext = createContext<AdminMe>({ user_id: null, email: null, role: null })
export const useAdmin = () => useContext(AdminContext)

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm border border-ink bg-white p-6 shadow-offset">
        <div className="mb-6 flex items-center gap-2">
          <LogoSymbol className="h-8 w-8" />
          <Wordmark className="text-lg" />
          <span className="ml-auto label-mono text-graphite">Админ</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
    setSending(false)
    if (authError) setError(authError.status === 400 ? 'Погрешна е-пошта или лозинка.' : 'Најавата не успеа. Обиди се повторно.')
  }

  return (
    <Centered>
      <h1 className="font-display text-2xl font-black">Најава за уредници</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">
            Е-пошта
          </label>
          <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={controlClass} />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
            Лозинка
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={controlClass}
          />
        </div>
        {error ? <ErrorBox message={error} /> : null}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? 'Се најавува…' : 'Најави се'}
        </Button>
      </form>
      <p className="mt-4 text-xs text-graphite">Пристап имаат само сметки на кои администратор им доделил улога.</p>
    </Centered>
  )
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => applyHead({ title: 'Администрација', noindex: true }), [])

  useEffect(() => {
    if (!isBackendConfigured) return
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const me = useAsync(() => (session ? adminApi.me() : Promise.resolve(null)), [session?.user.id])

  if (!isBackendConfigured) {
    return (
      <Centered>
        <h1 className="font-display text-xl font-black">Базата не е конфигурирана</h1>
        <p className="mt-2 text-sm text-graphite">
          Постави ги VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (види README → Поставување) и повторно изгради ја апликацијата.
        </p>
      </Centered>
    )
  }
  if (session === undefined || (session && me.loading)) {
    return (
      <Centered>
        <p aria-busy="true">Се вчитува…</p>
      </Centered>
    )
  }
  if (!session) return <Login />
  if (me.error || !me.data?.role) {
    return (
      <Centered>
        <h1 className="font-display text-xl font-black">Немаш уреднички пристап</h1>
        <p className="mt-2 text-sm text-graphite">
          {me.error ?? `Сметката ${session.user.email ?? ''} нема доделена улога. Улоги доделува администратор директно во базата на податоци.`}
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => getSupabase().auth.signOut()}>
          Одјави се
        </Button>
      </Centered>
    )
  }

  const isAdmin = me.data.role === 'admin'

  return (
    <AdminContext.Provider value={me.data}>
      <ToastProvider>
        <AdminLayout>
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="alatki" element={<ContentList entity="tools" />} />
            <Route path="alatki/nova" element={<ToolEditor />} />
            <Route path="alatki/:id" element={<ToolEditor />} />
            <Route path="kategorii" element={<CategoriesPage />} />
            <Route path="vodici" element={<ContentList entity="articles" />} />
            <Route path="vodici/nov" element={<ArticleEditor />} />
            <Route path="vodici/:id" element={<ArticleEditor />} />
            <Route path="sporedbi" element={<ContentList entity="comparisons" />} />
            <Route path="sporedbi/nova" element={<ComparisonEditor />} />
            <Route path="sporedbi/:id" element={<ComparisonEditor />} />
            <Route path="kolekcii" element={<ContentList entity="collections" />} />
            <Route path="kolekcii/nova" element={<CollectionEditor />} />
            <Route path="kolekcii/:id" element={<CollectionEditor />} />
            <Route path="proverka" element={<ReviewQueuePage />} />
            <Route path="predlozi" element={<SubmissionsPage />} />
            <Route path="poraki" element={<MessagesPage />} />
            <Route path="analitika" element={<AnalyticsPage />} />
            {isAdmin ? <Route path="bilten" element={<NewsletterPage />} /> : null}
            {isAdmin ? <Route path="postavki" element={<SettingsPage />} /> : null}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AdminLayout>
      </ToastProvider>
    </AdminContext.Provider>
  )
}
