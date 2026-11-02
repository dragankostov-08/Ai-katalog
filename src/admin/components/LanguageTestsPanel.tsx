import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { formatShortDate } from '../../lib/format'
import { statusLabels, verdictDescriptions, verdictLabels } from '../../lib/labels'
import type { ContentStatus, LanguageVerdict } from '../../lib/types'
import { adminApi, type AdminLanguageTest } from '../api'
import { ImageUpload } from './ImageUpload'
import { ErrorBox, MarkdownField, Panel, SelectField, StatusBadge, TextArea, TextField, useAsync, useToast } from './ui'

type Draft = Omit<AdminLanguageTest, 'id' | 'tool_id' | 'plan_tested' | 'model_version' | 'screenshot_url' | 'screenshot_alt'> & {
  id?: string
  plan_tested: string
  model_version: string
  screenshot_url: string
  screenshot_alt: string
}

const today = () => new Date().toISOString().slice(0, 10)

const blank = (): Draft => ({
  task_title: '',
  prompt_used: '',
  output_excerpt: '',
  verdict: 'mixed',
  notes: '',
  plan_tested: '',
  model_version: '',
  tested_at: today(),
  screenshot_url: '',
  screenshot_alt: '',
  status: 'draft',
})

const toDraft = (test: AdminLanguageTest): Draft => ({
  ...test,
  plan_tested: test.plan_tested ?? '',
  model_version: test.model_version ?? '',
  screenshot_url: test.screenshot_url ?? '',
  screenshot_alt: test.screenshot_alt ?? '',
})

/** Real editorial tests of the tool's Macedonian output. Rendered inside the tool form: no nested <form>. */
export function LanguageTestsPanel({ toolId, toolName }: { toolId: string; toolName: string }) {
  const toast = useToast()
  const tests = useAsync(() => adminApi.languageTests(toolId), [toolId])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current))

  async function save() {
    if (!draft) return
    const problems = [
      ...(draft.task_title.trim().length < 3 ? ['Внеси назив на задачата.'] : []),
      ...(draft.status === 'published' && draft.prompt_used.trim().length < 10 ? ['Внеси го промптот што го користеше.'] : []),
      ...(draft.status === 'published' && draft.output_excerpt.trim().length < 20 ? ['Залепи извадок од вистинскиот одговор.'] : []),
      ...(draft.screenshot_url && !draft.screenshot_alt.trim() ? ['Сликата од екранот бара алтернативен текст.'] : []),
    ]
    if (problems.length) return toast('error', problems.join(' '))
    setSaving(true)
    try {
      await adminApi.saveLanguageTest({
        ...draft,
        tool_id: toolId,
        plan_tested: draft.plan_tested || null,
        model_version: draft.model_version || null,
        screenshot_url: draft.screenshot_url || null,
        screenshot_alt: draft.screenshot_alt || null,
      })
      toast('success', 'Тестот е зачуван.')
      setDraft(null)
      tests.reload()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(test: AdminLanguageTest) {
    if (!window.confirm(`Да се избрише тестот „${test.task_title}“?`)) return
    try {
      await adminApi.deleteLanguageTest(test.id)
      tests.reload()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  return (
    <Panel
      title="Тестирано на македонски"
      actions={
        draft ? null : (
          <button type="button" onClick={() => setDraft(blank())} className="inline-flex items-center gap-1 text-xs underline">
            <Plus className="h-3.5 w-3.5" /> Нов тест
          </button>
        )
      }
    >
      <p className="mb-3 text-xs text-graphite">
        Објавувај само тестови што навистина си ги направил: истиот промпт, непроменет извадок од одговорот, датум и план. За споредба меѓу алатки,
        користи исто име на задачата и ист промпт.
      </p>
      {tests.error ? <ErrorBox message={tests.error} onRetry={tests.reload} /> : null}
      {tests.data?.length ? (
        <ul className="mb-4 divide-y divide-light overflow-hidden rounded-xl border border-light bg-white">
          {tests.data.map((test) => (
            <li key={test.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{test.task_title}</span>
                <span className="block font-mono text-xs text-graphite">
                  {verdictLabels[test.verdict]} · {formatShortDate(test.tested_at)}
                </span>
              </span>
              <StatusBadge status={test.status} />
              <button type="button" onClick={() => setDraft(toDraft(test))} className="inline-flex items-center gap-1 underline">
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Уреди
              </button>
              <button type="button" onClick={() => remove(test)} aria-label={`Избриши: ${test.task_title}`} className="p-1 text-tomato-ink">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : !draft ? (
        <p className="text-sm text-graphite">Сè уште нема тестови за {toolName}.</p>
      ) : null}

      {draft ? (
        <div role="group" aria-label="Тест на македонски" className="space-y-3 border border-warn/25 bg-warn-soft/60 p-3 rounded-2xl">
          <TextField label="Задача (наслов)" required value={draft.task_title} onChange={(v) => update({ task_title: v })} placeholder="на пр. Е-порака до клиент" />
          <TextArea label="Промпт што го користеше" required value={draft.prompt_used} onChange={(v) => update({ prompt_used: v })} rows={4} max={4000} />
          <TextArea label="Извадок од одговорот (непроменет)" required value={draft.output_excerpt} onChange={(v) => update({ output_excerpt: v })} rows={6} max={6000} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Оценка"
              value={draft.verdict}
              onChange={(v) => update({ verdict: (v || 'mixed') as LanguageVerdict })}
              options={(Object.keys(verdictLabels) as LanguageVerdict[]).map((value) => ({ value, label: verdictLabels[value] }))}
            />
            <TextField label="Датум на тестирање" type="date" value={draft.tested_at} onChange={(v) => update({ tested_at: v })} />
            <TextField label="Тестиран план" value={draft.plan_tested} onChange={(v) => update({ plan_tested: v })} placeholder="на пр. Бесплатен план" />
            <TextField label="Модел / верзија (ако е прикажана)" value={draft.model_version} onChange={(v) => update({ model_version: v })} />
          </div>
          <p className="text-xs text-graphite">{verdictDescriptions[draft.verdict]}</p>
          <MarkdownField label="Забелешки (што беше добро, какви грешки имаше)" value={draft.notes} onChange={(v) => update({ notes: v })} rows={4} />
          <ImageUpload label="Слика од екранот (незадолжително)" value={draft.screenshot_url} onChange={(v) => update({ screenshot_url: v })} folder="tests" name={`${toolName}-${draft.task_title}`} />
          {draft.screenshot_url ? <TextField label="Алтернативен текст" value={draft.screenshot_alt} onChange={(v) => update({ screenshot_alt: v })} /> : null}
          <SelectField
            label="Статус"
            value={draft.status}
            onChange={(v) => update({ status: (v || 'draft') as ContentStatus })}
            options={(['draft', 'needs_review', 'published', 'archived'] as ContentStatus[]).map((value) => ({ value, label: statusLabels[value] }))}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Се зачувува…' : 'Зачувај тест'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Откажи
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
