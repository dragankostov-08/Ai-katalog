import { useParams } from 'react-router'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { Checkbox, controlClass, MarkdownField, OrderedPicker, Panel, TextArea } from '../components/ui'

interface Entry {
  tool_id: string
  editorial_reason: string
  is_sponsored: boolean
}

interface CollectionForm extends BaseForm {
  description: string
  intro: string
  methodology: string
  entries: Entry[]
}

const EMPTY: CollectionForm = {
  title: '',
  slug: '',
  status: 'draft',
  is_featured: false,
  seo_title: '',
  seo_description: '',
  description: '',
  intro: '',
  methodology: '',
  entries: [],
}

export function CollectionEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getCollection(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState(EMPTY, record.data, (r, base) => ({
    ...base,
    entries: ((r.entries as Entry[]) ?? []).map((e) => ({ tool_id: e.tool_id, editorial_reason: e.editorial_reason ?? '', is_sponsored: Boolean(e.is_sponsored) })),
  }))

  return (
    <EditorShell
      entity="collections"
      id={id}
      title="Листа"
      newTitle="Нова уреднична листа"
      listPath="/admin/kolekcii"
      publicPath="/najdobri"
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
        ...(f.entries.some((e) => e.editorial_reason.trim().length < 10) ? ['Секоја алатка бара уредничко образложение (најмалку 10 знаци).'] : []),
        ...(f.status === 'published' && f.methodology.trim().length < 60 ? ['За објавување е потребна методологија од најмалку 60 знаци.'] : []),
        ...(f.status === 'published' && f.description.trim().length < 20 ? ['За објавување е потребен опис од најмалку 20 знаци.'] : []),
        ...(f.status === 'published' && !f.entries.length ? ['Листата нема алатки.'] : []),
      ]}
      save={() =>
        adminApi.saveCollection({
          ...(id ? { id } : {}),
          title: form.title,
          slug: form.slug,
          description: form.description,
          intro: form.intro,
          methodology: form.methodology,
          status: form.status,
          is_featured: form.is_featured,
          seo_title: blankToNull(form.seo_title),
          seo_description: blankToNull(form.seo_description),
          entries: form.entries,
        })
      }
      onSaved={() => {
        setDirty(false)
        if (id) record.reload()
      }}
    >
      <Panel title="Опис и методологија">
        <div className="space-y-4">
          <TextArea label="Краток опис" required value={form.description} onChange={(v) => set('description', v)} rows={2} max={320} />
          <MarkdownField label="Вовед" value={form.intro} onChange={(v) => set('intro', v)} rows={5} />
          <MarkdownField
            label="Методологија"
            required
            value={form.methodology}
            onChange={(v) => set('methodology', v)}
            rows={6}
            hint="Задолжително: по кои критериуми се избрани алатките и дали има платени позиции."
          />
        </div>
      </Panel>
      <Panel title="Алатки во листата">
        <OrderedPicker
          label="Редослед"
          options={options.data?.tools ?? []}
          value={form.entries}
          onChange={(v) => set('entries', v)}
          create={(tool_id) => ({ tool_id, editorial_reason: '', is_sponsored: false })}
          renderExtra={(item, update) => (
            <div className="space-y-2">
              <textarea
                aria-label="Зошто е во листата"
                placeholder="Зошто е во листата (се прикажува јавно)"
                rows={2}
                value={item.editorial_reason}
                onChange={(e) => update({ editorial_reason: e.target.value })}
                className={controlClass}
              />
              <Checkbox label="Платена позиција (јавно означена како спонзорирана)" checked={item.is_sponsored} onChange={(v) => update({ is_sponsored: v })} />
            </div>
          )}
        />
      </Panel>
    </EditorShell>
  )
}
