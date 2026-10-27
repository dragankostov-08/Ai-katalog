import { Plus, Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { controlClass, MarkdownField, OrderedPicker, Panel } from '../components/ui'

interface ComparisonToolRow {
  tool_id: string
  strengths: string
  limitations: string
  best_for: string
}

interface Criterion {
  label: string
  values: Record<string, string>
}

interface ComparisonForm extends BaseForm {
  introduction: string
  verdict: string
  tools: ComparisonToolRow[]
  criteria: Criterion[]
}

const EMPTY: ComparisonForm = { title: '', slug: '', status: 'draft', is_featured: false, seo_title: '', seo_description: '', introduction: '', verdict: '', tools: [], criteria: [] }

export function ComparisonEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getComparison(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState(EMPTY, record.data, (r, base) => ({
    ...base,
    tools: ((r.tools as Record<string, string | null>[]) ?? []).map((t) => ({
      tool_id: t.tool_id ?? '',
      strengths: t.strengths ?? '',
      limitations: t.limitations ?? '',
      best_for: t.best_for ?? '',
    })),
    criteria: ((r.criteria as Criterion[]) ?? []).map((c) => ({ label: c.label ?? '', values: c.values ?? {} })),
  }))
  const toolName = (toolId: string) => options.data?.tools.find((t) => t.id === toolId)?.name ?? toolId

  return (
    <EditorShell
      entity="comparisons"
      id={id}
      title="Споредба"
      newTitle="Нова споредба"
      listPath="/admin/sporedbi"
      publicPath="/sporedbi"
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
        ...(f.status === 'published' && f.tools.length < 2 ? ['Споредбата мора да содржи најмалку две алатки.'] : []),
        ...(f.status === 'published' && f.introduction.trim().length < 40 ? ['За објавување е потребен вовед од најмалку 40 знаци.'] : []),
        ...(f.criteria.some((c) => !c.label.trim()) ? ['Секој критериум мора да има име.'] : []),
      ]}
      save={() =>
        adminApi.saveComparison({
          ...(id ? { id } : {}),
          title: form.title,
          slug: form.slug,
          introduction: form.introduction,
          verdict: form.verdict,
          criteria: form.criteria.map((c) => ({
            label: c.label.trim(),
            values: Object.fromEntries(Object.entries(c.values).filter(([toolId, value]) => value.trim() && form.tools.some((t) => t.tool_id === toolId))),
          })),
          status: form.status,
          is_featured: form.is_featured,
          seo_title: blankToNull(form.seo_title),
          seo_description: blankToNull(form.seo_description),
          tools: form.tools,
        })
      }
      onSaved={() => {
        setDirty(false)
        if (id) record.reload()
      }}
    >
      <Panel title="Текст">
        <div className="space-y-4">
          <MarkdownField label="Вовед" required value={form.introduction} onChange={(v) => set('introduction', v)} rows={6} />
          <MarkdownField label="Заклучок (уредничко мислење)" value={form.verdict} onChange={(v) => set('verdict', v)} rows={6} />
        </div>
      </Panel>
      <Panel title="Алатки во споредбата">
        <p className="mb-3 text-xs text-graphite">
          Цената, бесплатниот план, платформите и функциите автоматски се преземаат од профилите — и се прикажуваат само ако се проверени.
        </p>
        <OrderedPicker
          label="Алатки"
          options={options.data?.tools ?? []}
          value={form.tools}
          onChange={(v) => set('tools', v)}
          create={(tool_id) => ({ tool_id, strengths: '', limitations: '', best_for: '' })}
          renderExtra={(item, update) => (
            <div className="grid gap-2 sm:grid-cols-3">
              <textarea aria-label="Предности" placeholder="Предности во оваа споредба" rows={2} value={item.strengths} onChange={(e) => update({ strengths: e.target.value })} className={controlClass} />
              <textarea aria-label="Ограничувања" placeholder="Ограничувања" rows={2} value={item.limitations} onChange={(e) => update({ limitations: e.target.value })} className={controlClass} />
              <textarea aria-label="Препорачано за" placeholder="Препорачано за" rows={2} value={item.best_for} onChange={(e) => update({ best_for: e.target.value })} className={controlClass} />
            </div>
          )}
        />
      </Panel>
      <Panel
        title="Дополнителни критериуми"
        actions={
          <button type="button" className="inline-flex items-center gap-1 text-xs underline" onClick={() => set('criteria', [...form.criteria, { label: '', values: {} }])}>
            <Plus className="h-3.5 w-3.5" /> Додај критериум
          </button>
        }
      >
        {form.criteria.length ? (
          <ol className="space-y-4">
            {form.criteria.map((criterion, index) => {
              const update = (patch: Partial<Criterion>) => set('criteria', form.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)))
              return (
                <li key={index} className="border border-ink/15 bg-paper p-3">
                  <div className="flex gap-2">
                    <input aria-label="Критериум" placeholder="Име на критериумот, на пр. Работа со долги документи" value={criterion.label} onChange={(e) => update({ label: e.target.value })} className={controlClass} />
                    <button type="button" aria-label="Отстрани критериум" onClick={() => set('criteria', form.criteria.filter((_, i) => i !== index))} className="p-1.5 text-tomato-ink">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {form.tools.map((tool) => (
                      <label key={tool.tool_id} className="text-xs">
                        <span className="mb-0.5 block font-medium">{toolName(tool.tool_id)}</span>
                        <input
                          value={criterion.values[tool.tool_id] ?? ''}
                          placeholder="Празно = „Нема проверен податок“"
                          onChange={(e) => update({ values: { ...criterion.values, [tool.tool_id]: e.target.value } })}
                          className={controlClass}
                        />
                      </label>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm text-graphite">Нема дополнителни критериуми.</p>
        )}
      </Panel>
    </EditorShell>
  )
}
