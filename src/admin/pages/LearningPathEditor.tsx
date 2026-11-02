import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import { skillLabels, stepTypeLabels } from '../../lib/labels'
import type { SkillLevel, StepType } from '../../lib/types'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { controlClass, MarkdownField, move, Panel, SelectField, TextArea, TextField } from '../components/ui'

interface StepForm {
  id?: string
  title: string
  body: string
  step_type: StepType
  article_id: string
  tool_id: string
  prompt_id: string
  video_id: string
  estimated_minutes: string
}

interface PathForm extends BaseForm {
  summary: string
  intro: string
  level: SkillLevel | ''
  estimated_days: string
  steps: StepForm[]
}

const EMPTY: PathForm = {
  title: '',
  slug: '',
  status: 'draft',
  is_featured: false,
  seo_title: '',
  seo_description: '',
  summary: '',
  intro: '',
  level: '',
  estimated_days: '',
  steps: [],
}

const newStep = (): StepForm => ({ title: '', body: '', step_type: 'read', article_id: '', tool_id: '', prompt_id: '', video_id: '', estimated_minutes: '' })
const str = (value: unknown) => (value === null || value === undefined ? '' : String(value))

export function LearningPathEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getLearningPath(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState<PathForm>(EMPTY, record.data, (r, base) => ({
    ...base,
    level: (r.level as SkillLevel | null) ?? '',
    estimated_days: str(r.estimated_days),
    steps: ((r.steps as Record<string, unknown>[]) ?? []).map((s) => ({
      id: str(s.id),
      title: str(s.title),
      body: str(s.body),
      step_type: (s.step_type as StepType) ?? 'read',
      article_id: str(s.article_id),
      tool_id: str(s.tool_id),
      prompt_id: str(s.prompt_id),
      video_id: str(s.video_id),
      estimated_minutes: str(s.estimated_minutes),
    })),
  }))
  const opts = options.data
  const pick = (list: { id: string; name: string; status: string }[] | undefined) => [
    { value: '', label: '—' },
    ...(list ?? []).map((item) => ({ value: item.id, label: `${item.name}${item.status !== 'published' ? ' (необјавено)' : ''}` })),
  ]

  return (
    <EditorShell
      entity="learning_paths"
      id={id}
      title="Патека"
      newTitle="Нова патека"
      listPath="/admin/patki"
      publicPath="/patki"
      form={form}
      set={set}
      setSlug={setSlug}
      loading={(Boolean(id) && record.loading && !record.data) || options.loading}
      error={record.error || options.error}
      missing={Boolean(id) && !record.loading && !record.data}
      onRetry={() => {
        record.reload()
        options.reload()
      }}
      validate={(f) => [
        ...(f.steps.some((s) => s.title.trim().length < 3) ? ['Секој чекор бара наслов (најмалку 3 знаци).'] : []),
        ...(f.status === 'published' && !f.steps.length ? ['Патеката мора да има најмалку еден чекор.'] : []),
        ...(f.status === 'published' && f.summary.trim().length < 20 ? ['За објавување е потребен опис од најмалку 20 знаци.'] : []),
        ...(f.estimated_days && !(Number(f.estimated_days) >= 1 && Number(f.estimated_days) <= 90) ? ['Траењето е од 1 до 90 дена.'] : []),
      ]}
      save={() =>
        adminApi.saveLearningPath({
          ...(id ? { id } : {}),
          title: form.title,
          slug: form.slug,
          summary: form.summary,
          intro: form.intro,
          level: blankToNull(form.level),
          estimated_days: form.estimated_days ? Number(form.estimated_days) : null,
          status: form.status,
          is_featured: form.is_featured,
          seo_title: blankToNull(form.seo_title),
          seo_description: blankToNull(form.seo_description),
          steps: form.steps.map((s) => ({ ...s, estimated_minutes: s.estimated_minutes || null })),
        })
      }
      onSaved={() => {
        setDirty(false)
        if (id) record.reload()
      }}
    >
      <Panel title="Опис">
        <div className="space-y-4">
          <TextArea label="Краток опис" required value={form.summary} onChange={(v) => set('summary', v)} rows={2} max={320} />
          <MarkdownField label="Вовед" value={form.intro} onChange={(v) => set('intro', v)} rows={4} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Ниво"
              value={form.level}
              onChange={(v) => set('level', v)}
              options={[{ value: '', label: '—' }, ...(Object.keys(skillLabels) as SkillLevel[]).map((value) => ({ value, label: skillLabels[value] }))]}
            />
            <TextField label="Траење (денови)" type="number" value={form.estimated_days} onChange={(v) => set('estimated_days', v)} />
          </div>
        </div>
      </Panel>
      <Panel
        title={`Чекори (${form.steps.length})`}
        actions={
          <button type="button" onClick={() => set('steps', [...form.steps, newStep()])} className="inline-flex items-center gap-1 text-xs underline">
            <Plus className="h-3.5 w-3.5" /> Додај чекор
          </button>
        }
      >
        <p className="mb-3 text-xs text-graphite">Постојните чекори го задржуваат идентитетот при зачувување, па напредокот на посетителите не се губи.</p>
        <ol className="space-y-4">
          {form.steps.map((step, index) => {
            const update = (patch: Partial<StepForm>) => set('steps', form.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)))
            return (
              <li key={step.id || `new-${index}`} className="border border-ink/20 bg-paper p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-graphite">{index + 1}.</span>
                  <input aria-label="Наслов на чекорот" placeholder="Наслов на чекорот" value={step.title} onChange={(e) => update({ title: e.target.value })} className={controlClass} />
                  <button type="button" aria-label="Нагоре" disabled={index === 0} onClick={() => set('steps', move(form.steps, index, -1))} className="p-1 disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Надолу" disabled={index === form.steps.length - 1} onClick={() => set('steps', move(form.steps, index, 1))} className="p-1 disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Отстрани чекор" onClick={() => set('steps', form.steps.filter((_, i) => i !== index))} className="p-1 text-tomato-ink">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <SelectField
                    label="Вид"
                    value={step.step_type}
                    onChange={(v) => update({ step_type: (v || 'read') as StepType })}
                    options={(Object.keys(stepTypeLabels) as StepType[]).map((value) => ({ value, label: stepTypeLabels[value] }))}
                  />
                  <TextField label="Минути" type="number" value={step.estimated_minutes} onChange={(v) => update({ estimated_minutes: v })} />
                </div>
                <div className="mt-3">
                  <MarkdownField label="Упатство" value={step.body} onChange={(v) => update({ body: v })} rows={3} hint="Што точно да направи посетителот во овој чекор." />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SelectField label="Водич" value={step.article_id} onChange={(v) => update({ article_id: v })} options={pick(opts?.articles)} />
                  <SelectField label="Алатка" value={step.tool_id} onChange={(v) => update({ tool_id: v })} options={pick(opts?.tools)} />
                  <SelectField label="Промпт" value={step.prompt_id} onChange={(v) => update({ prompt_id: v })} options={pick(opts?.prompts)} />
                  <SelectField label="Видео" value={step.video_id} onChange={(v) => update({ video_id: v })} options={pick(opts?.videos)} />
                </div>
              </li>
            )
          })}
        </ol>
        {!form.steps.length ? <p className="text-sm text-graphite">Сè уште нема чекори.</p> : null}
      </Panel>
    </EditorShell>
  )
}
