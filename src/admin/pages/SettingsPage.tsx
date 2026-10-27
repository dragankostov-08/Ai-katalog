import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { fetchSite } from '../../lib/api'
import { adminApi } from '../api'
import { AdminPageHeader, ErrorBox, LoadingRows, Panel, TextArea, TextField, useAsync, useToast } from '../components/ui'

const FIELDS: { key: string; label: string; hint?: string; multiline?: boolean }[] = [
  { key: 'publisher_name', label: 'Издавач (правно лице или физичко лице)', hint: 'Се прикажува во „За нас“, „Приватност“ и подножјето.' },
  { key: 'publisher_address', label: 'Адреса на издавачот' },
  { key: 'publisher_registration', label: 'Регистрација (ЕМБС / ЕДБ)', hint: 'Внеси само вистински, регистрирани податоци.' },
  { key: 'contact_email', label: 'Е-пошта за контакт' },
  { key: 'editorial_email', label: 'Е-пошта на уредништвото' },
  { key: 'advertising_email', label: 'Е-пошта за огласување' },
  { key: 'about_text', label: 'Дополнителен текст за „За нас“', multiline: true },
]

export function SettingsPage() {
  const toast = useToast()
  const { data, error, loading, reload } = useAsync(() => fetchSite(), [])
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) setValues(Object.fromEntries(FIELDS.map((field) => [field.key, (data.settings as Record<string, string>)[field.key] ?? ''])))
  }, [data])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const invalidEmail = ['contact_email', 'editorial_email', 'advertising_email'].find((key) => values[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values[key]))
    if (invalidEmail) {
      toast('error', 'Една од е-адресите не е валидна.')
      return
    }
    setSaving(true)
    try {
      await adminApi.saveSettings(values)
      toast('success', 'Поставките се зачувани. Јавните страници ќе се ажурираат по следното градење на сајтот.')
      reload()
    } catch (caught) {
      toast('error', (caught as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminPageHeader title="Поставки" description="Податоци за издавачот и контакт што се прикажуваат на правните страници. Не внесувај измислени податоци." />
      {loading && !data ? <LoadingRows /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <form onSubmit={onSubmit}>
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) =>
                field.multiline ? (
                  <TextArea key={field.key} className="sm:col-span-2" label={field.label} hint={field.hint} value={values[field.key] ?? ''} onChange={(v) => setValues({ ...values, [field.key]: v })} rows={4} />
                ) : (
                  <TextField key={field.key} label={field.label} hint={field.hint} value={values[field.key] ?? ''} onChange={(v) => setValues({ ...values, [field.key]: v })} />
                ),
              )}
            </div>
            <Button type="submit" className="mt-6" disabled={saving}>
              {saving ? 'Се зачувува…' : 'Зачувај'}
            </Button>
          </Panel>
        </form>
      )}
    </>
  )
}
