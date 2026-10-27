import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { onOpenConsentPreferences, saveConsent, useConsent } from '../../lib/consent'
import { env } from '../../lib/env'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

function Toggle({ id, label, description, checked, disabled, onChange }: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink/15 py-4 last:border-b-0">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p id={`${id}-desc`} className="mt-1 text-sm text-graphite">
          {description}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-describedby={`${id}-desc`}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-ink disabled:opacity-60"
      />
    </div>
  )
}

/**
 * Consent for optional processing. Nothing optional (aggregate analytics,
 * advertising) runs before a choice; rejecting is as easy as accepting.
 */
export function ConsentBanner() {
  const consent = useConsent()
  const [mounted, setMounted] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [advertising, setAdvertising] = useState(false)
  const adsAvailable = Boolean(env.adsenseClient)

  useEffect(() => setMounted(true), [])
  useEffect(
    () =>
      onOpenConsentPreferences(() => {
        setAnalytics(consent.analytics)
        setAdvertising(consent.advertising)
        setPreferencesOpen(true)
      }),
    [consent.analytics, consent.advertising],
  )

  if (!mounted) return null

  const decide = (choice: { analytics: boolean; advertising: boolean }) => {
    saveConsent(choice)
    setPreferencesOpen(false)
  }

  return (
    <>
      {!consent.decided && !preferencesOpen ? (
        <section
          aria-label="Приватност и колачиња"
          className="fixed inset-x-3 bottom-3 z-50 border border-ink bg-paper p-4 shadow-paper md:right-auto md:left-5 md:max-w-md"
        >
          <p className="label-mono mb-1.5 text-tomato-ink">Приватност</p>
          <p className="text-sm text-charcoal">
            Користиме анонимни збирни статистики{adsAvailable ? ' и рекламирање' : ''} само ако се согласиш. Омилените алатки се чуваат само во твојот
            прелистувач.{' '}
            <Link to="/kolacinja" className="underline underline-offset-2">
              Повеќе
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => decide({ analytics: true, advertising: adsAvailable })}>
              Прифати сè
            </Button>
            <Button size="sm" variant="secondary" onClick={() => decide({ analytics: false, advertising: false })}>
              Само неопходни
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAnalytics(consent.analytics)
                setAdvertising(consent.advertising)
                setPreferencesOpen(true)
              }}
            >
              Прилагоди
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
        title="Поставки за приватност"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => decide({ analytics: false, advertising: false })}>
              Одбиј ги сите
            </Button>
            <Button onClick={() => decide({ analytics, advertising: adsAvailable && advertising })}>Зачувај избор</Button>
          </div>
        }
      >
        <Toggle
          id="consent-necessary"
          label="Неопходни"
          description="Твојот избор за приватност и омилените алатки, зачувани само во прелистувачот. Секогаш вклучени."
          checked
          disabled
        />
        <Toggle
          id="consent-analytics"
          label="Збирна статистика"
          description="Бројки по ден (на пр. колку пати е отворен профилот на некоја алатка). Без колачиња, без идентификатори и без текстот што го пребаруваш."
          checked={analytics}
          onChange={setAnalytics}
        />
        <Toggle
          id="consent-ads"
          label="Рекламирање"
          description={
            adsAvailable
              ? 'Дозволува вчитување реклами од надворешен рекламен партнер, кој може да користи колачиња.'
              : 'Моментално не прикажуваме реклами. Оваа опција ќе стане активна кога ќе се воведат.'
          }
          checked={adsAvailable && advertising}
          disabled={!adsAvailable}
          onChange={setAdvertising}
        />
      </Dialog>
    </>
  )
}
