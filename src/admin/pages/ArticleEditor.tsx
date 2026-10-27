import { useParams } from 'react-router'
import { adminApi } from '../api'
import { blankToNull, EditorShell, useAsync, useEditorState, type BaseForm } from '../components/EditorShell'
import { ImageUpload } from '../components/ImageUpload'
import { MarkdownField, OrderedPicker, Panel, SelectField, TextArea, TextField } from '../components/ui'

interface ArticleForm extends BaseForm {
  excerpt: string
  content: string
  cover_image_url: string
  cover_image_alt: string
  cover_caption: string
  author_name: string
  category_id: string
  tools: { tool_id: string }[]
}

const EMPTY: ArticleForm = {
  title: '',
  slug: '',
  status: 'draft',
  is_featured: false,
  seo_title: '',
  seo_description: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  cover_image_alt: '',
  cover_caption: '',
  author_name: 'Уредништво на AI KATALOG',
  category_id: '',
  tools: [],
}

export function ArticleEditor() {
  const { id } = useParams()
  const record = useAsync(() => (id ? adminApi.getArticle(id) : Promise.resolve(null)), [id])
  const options = useAsync(() => adminApi.options(), [])
  const { form, set, setSlug, setDirty } = useEditorState(EMPTY, record.data, (r, base) => ({
    ...base,
    tools: ((r.tool_ids as string[]) ?? []).map((tool_id) => ({ tool_id })),
  }))

  return (
    <EditorShell
      entity="articles"
      id={id}
      title="Водич"
      newTitle="Нов водич"
      listPath="/admin/vodici"
      publicPath="/vodici"
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
        ...(f.cover_image_url && !f.cover_image_alt.trim() ? ['Насловната слика бара алтернативен текст.'] : []),
        ...(f.status === 'published' && f.content.trim().length < 200 ? ['За објавување содржината треба да има најмалку 200 знаци.'] : []),
        ...(f.status === 'published' && f.excerpt.trim().length < 20 ? ['За објавување е потребен краток опис од најмалку 20 знаци.'] : []),
      ]}
      save={() =>
        adminApi.saveArticle({
          ...(id ? { id } : {}),
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt,
          content: form.content,
          cover_image_url: blankToNull(form.cover_image_url),
          cover_image_alt: blankToNull(form.cover_image_alt),
          cover_caption: blankToNull(form.cover_caption),
          author_name: blankToNull(form.author_name),
          category_id: blankToNull(form.category_id),
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
      <Panel title="Содржина">
        <div className="space-y-4">
          <TextArea label="Краток опис (воведен дел)" required value={form.excerpt} onChange={(v) => set('excerpt', v)} rows={2} max={320} />
          <MarkdownField label="Текст" required value={form.content} onChange={(v) => set('content', v)} rows={22} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Автор" value={form.author_name} onChange={(v) => set('author_name', v)} />
            <SelectField
              label="Тема (категорија)"
              value={form.category_id}
              onChange={(v) => set('category_id', v)}
              options={[{ value: '', label: '— без категорија —' }, ...(options.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
        </div>
      </Panel>
      <Panel title="Насловна слика">
        <div className="space-y-4">
          <ImageUpload label="Слика" value={form.cover_image_url} onChange={(v) => set('cover_image_url', v)} folder="articles" name={form.slug || 'vodic'} hint="Без слика се користи типографска насловна страна." />
          <TextField label="Алтернативен текст" value={form.cover_image_alt} onChange={(v) => set('cover_image_alt', v)} hint="Што се гледа на сликата — за читачи на екран." />
          <TextField label="Потпис / извор" value={form.cover_caption} onChange={(v) => set('cover_caption', v)} />
        </div>
      </Panel>
      <Panel title="Спомнати алатки">
        <OrderedPicker label="Алатки поврзани со водичот" options={options.data?.tools ?? []} value={form.tools} onChange={(v) => set('tools', v)} create={(tool_id) => ({ tool_id })} />
      </Panel>
    </EditorShell>
  )
}
