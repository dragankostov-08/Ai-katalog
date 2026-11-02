import { useParams } from 'react-router'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { CheckboxGroup, MarkdownField, OrderedPicker, Panel, TextArea, TextField } from '../components/ui'

interface TermForm extends BaseForm {
  english_term: string
  short_definition: string
  body: string
  related_ids: string[]
  tools: { tool_id: string }[]
}

const EMPTY: TermForm = {
  title: '',
  slug: '',
  status: 'draft',
  is_featured: false,
  seo_title: '',
  seo_description: '',
  english_term: '',
  short_definition: '',
  body: '',
  related_ids: [],
  tools: [],
}

export function GlossaryEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getGlossaryTerm(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState(EMPTY, record.data, (r, base) => ({
    ...base,
    // The shared editor frame calls the main field "title"; for terms it is the term itself.
    title: String(r.term ?? ''),
    related_ids: (r.related_ids as string[]) ?? [],
    tools: ((r.tool_ids as string[]) ?? []).map((tool_id) => ({ tool_id })),
  }))
  const otherTerms = (options.data?.glossary ?? []).filter((g) => g.id !== id)

  return (
    <EditorShell
      entity="glossary_terms"
      id={id}
      title="Поим"
      newTitle="Нов поим"
      titleLabel="Поим"
      hideFeatured
      listPath="/admin/recnik"
      publicPath="/recnik"
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
      validate={(f) => (f.status === 'published' && f.short_definition.trim().length < 20 ? ['За објавување е потребна дефиниција од најмалку 20 знаци.'] : [])}
      save={() =>
        adminApi.saveGlossaryTerm({
          ...(id ? { id } : {}),
          term: form.title,
          slug: form.slug,
          english_term: blankToNull(form.english_term),
          short_definition: form.short_definition,
          body: form.body,
          status: form.status,
          seo_title: blankToNull(form.seo_title),
          seo_description: blankToNull(form.seo_description),
          related_ids: form.related_ids,
          tool_ids: form.tools.map((t) => t.tool_id),
        })
      }
      onSaved={() => {
        setDirty(false)
        if (id) record.reload()
      }}
    >
      <Panel title="Дефиниција">
        <div className="space-y-4">
          <TextField label="Англиски термин" value={form.english_term} onChange={(v) => set('english_term', v)} />
          <TextArea label="Кратка дефиниција" required value={form.short_definition} onChange={(v) => set('short_definition', v)} rows={2} max={300} />
          <MarkdownField label="Подетално објаснување" value={form.body} onChange={(v) => set('body', v)} rows={8} />
        </div>
      </Panel>
      <Panel title="Врски">
        <div className="space-y-4">
          {otherTerms.length ? (
            <CheckboxGroup label="Поврзани поими" options={otherTerms.map((g) => ({ value: g.id, label: g.name }))} value={form.related_ids} onChange={(v) => set('related_ids', v)} columns={3} />
          ) : null}
          <OrderedPicker label="Алатки поврзани со поимот" options={options.data?.tools ?? []} value={form.tools} onChange={(v) => set('tools', v)} create={(tool_id) => ({ tool_id })} />
        </div>
      </Panel>
    </EditorShell>
  )
}
