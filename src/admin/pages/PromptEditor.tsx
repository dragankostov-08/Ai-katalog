import { useParams } from 'react-router'
import { skillLabels } from '../../lib/labels'
import type { SkillLevel } from '../../lib/types'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { MarkdownField, OrderedPicker, Panel, SelectField, TextArea } from '../components/ui'

interface PromptForm extends BaseForm {
  summary: string
  prompt_text: string
  how_to_use: string
  example_output: string
  use_case_id: string
  category_id: string
  skill_level: SkillLevel | ''
  tools: { tool_id: string }[]
}

const EMPTY: PromptForm = {
  title: '',
  slug: '',
  status: 'draft',
  is_featured: false,
  seo_title: '',
  seo_description: '',
  summary: '',
  prompt_text: '',
  how_to_use: '',
  example_output: '',
  use_case_id: '',
  category_id: '',
  skill_level: '',
  tools: [],
}

export function PromptEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getPrompt(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState(EMPTY, record.data, (r, base) => ({
    ...base,
    tools: ((r.tool_ids as string[]) ?? []).map((tool_id) => ({ tool_id })),
  }))

  return (
    <EditorShell
      entity="prompts"
      id={id}
      title="Промпт"
      newTitle="Нов промпт"
      listPath="/admin/promptovi"
      publicPath="/promptovi"
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
        ...(f.prompt_text.length > 6000 ? ['Промптот може да има најмногу 6000 знаци.'] : []),
        ...(f.status === 'published' && f.prompt_text.trim().length < 20 ? ['За објавување промптот треба да има најмалку 20 знаци.'] : []),
        ...(f.status === 'published' && f.summary.trim().length < 20 ? ['За објавување е потребен опис од најмалку 20 знаци.'] : []),
      ]}
      save={() =>
        adminApi.savePrompt({
          ...(id ? { id } : {}),
          title: form.title,
          slug: form.slug,
          summary: form.summary,
          prompt_text: form.prompt_text,
          how_to_use: form.how_to_use,
          example_output: blankToNull(form.example_output),
          use_case_id: blankToNull(form.use_case_id),
          category_id: blankToNull(form.category_id),
          skill_level: blankToNull(form.skill_level),
          status: form.status,
          is_featured: form.is_featured,
          seo_title: blankToNull(form.seo_title),
          seo_description: blankToNull(form.seo_description),
          tool_ids: form.tools.map((t) => t.tool_id),
        })
      }
      onSaved={() => {
        setDirty(false)
        if (id) record.reload()
      }}
    >
      <Panel title="Промпт">
        <div className="space-y-4">
          <TextArea label="Краток опис" required value={form.summary} onChange={(v) => set('summary', v)} rows={2} max={320} />
          <TextArea
            label="Текст на промптот"
            required
            value={form.prompt_text}
            onChange={(v) => set('prompt_text', v)}
            rows={12}
            max={6000}
            hint="Деловите што корисникот треба да ги замени стави ги во [квадратни загради]."
          />
          <MarkdownField label="Како да се користи" value={form.how_to_use} onChange={(v) => set('how_to_use', v)} rows={5} />
          <MarkdownField
            label="Пример за резултат (незадолжително)"
            value={form.example_output}
            onChange={(v) => set('example_output', v)}
            rows={6}
            hint="Само вистински резултат што го доби при тестирање — не измислен."
          />
        </div>
      </Panel>
      <Panel title="Категоризација">
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Намена"
            value={form.use_case_id}
            onChange={(v) => set('use_case_id', v)}
            options={[{ value: '', label: '—' }, ...(options.data?.use_cases ?? []).map((u) => ({ value: u.id, label: u.name }))]}
          />
          <SelectField
            label="Категорија"
            value={form.category_id}
            onChange={(v) => set('category_id', v)}
            options={[{ value: '', label: '—' }, ...(options.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
          <SelectField
            label="Ниво"
            value={form.skill_level}
            onChange={(v) => set('skill_level', v)}
            options={[{ value: '', label: '—' }, ...(Object.keys(skillLabels) as SkillLevel[]).map((value) => ({ value, label: skillLabels[value] }))]}
          />
        </div>
        <div className="mt-4">
          <OrderedPicker label="Алатки со кои работи" options={options.data?.tools ?? []} value={form.tools} onChange={(v) => set('tools', v)} create={(tool_id) => ({ tool_id })} />
        </div>
      </Panel>
    </EditorShell>
  )
}
