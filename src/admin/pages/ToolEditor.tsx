import { ArrowUp, BadgeCheck, Eye, Flag, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VerificationBadge } from '../../components/catalog/Badges'
import { Button } from '../../components/ui/Button'
import { formatDate, formatShortDate } from '../../lib/format'
import {
  capabilityLabels,
  languageSupportLabels,
  platformLabels,
  pricePeriodLabels,
  pricingLabels,
  skillLabels,
  statusLabels,
} from '../../lib/labels'
import { slugify, SLUG_PATTERN } from '../../lib/slug'
import {
  CAPABILITIES,
  PLATFORMS,
  type Capability,
  type ContentStatus,
  type LanguageSupport,
  type Platform,
  type PricePeriod,
  type PricingType,
  type SkillLevel,
  type VerificationStatus,
} from '../../lib/types'
import { useAdmin } from '../AdminApp'
import { adminApi } from '../api'
import { ImageUpload } from '../components/ImageUpload'
import {
  AdminPageHeader,
  Checkbox,
  CheckboxGroup,
  controlClass,
  ErrorBox,
  ListEditor,
  LoadingRows,
  MarkdownField,
  move,
  Panel,
  SelectField,
  StatusBadge,
  TextArea,
  TextField,
  useAsync,
  useToast,
} from '../components/ui'

interface FeatureRow {
  id?: string
  feature_name: string
  feature_value: string
  verification_notes: string
  verified_at: string
}

interface ToolForm {
  name: string
  slug: string
  developer: string
  website_url: string
  logo_url: string
  short_description: string
  description: string
  primary_category_id: string
  category_ids: string[]
  use_case_ids: string[]
  keywords: string[]
  pricing_type: PricingType
  starting_price: string
  currency: string
  price_period: PricePeriod | ''
  has_free_plan: '' | 'yes' | 'no'
  free_plan_limits: string
  pricing_notes: string
  platforms: Platform[]
  capabilities: Capability[]
  macedonian_support: LanguageSupport
  skill_level: SkillLevel | ''
  best_for: string
  features: FeatureRow[]
  pros: string[]
  cons: string[]
  editorial_verdict: string
  status: ContentStatus
  is_featured: boolean
  is_sponsored: boolean
  sponsor_note: string
  next_review_at: string
  seo_title: string
  seo_description: string
}

interface ToolMeta {
  verification_status: VerificationStatus
  last_verified_at: string | null
  verification_notes: string | null
  history: { id: string; field_changed: string; old_value: string | null; new_value: string | null; note: string | null; verified_at: string }[]
}

const EMPTY: ToolForm = {
  name: '',
  slug: '',
  developer: '',
  website_url: '',
  logo_url: '',
  short_description: '',
  description: '',
  primary_category_id: '',
  category_ids: [],
  use_case_ids: [],
  keywords: [],
  pricing_type: 'unknown',
  starting_price: '',
  currency: '',
  price_period: '',
  has_free_plan: '',
  free_plan_limits: '',
  pricing_notes: '',
  platforms: [],
  capabilities: [],
  macedonian_support: 'unknown',
  skill_level: '',
  best_for: '',
  features: [],
  pros: [],
  cons: [],
  editorial_verdict: '',
  status: 'draft',
  is_featured: false,
  is_sponsored: false,
  sponsor_note: '',
  next_review_at: '',
  seo_title: '',
  seo_description: '',
}

const str = (value: unknown) => (value === null || value === undefined ? '' : String(value))

function fromRecord(record: Record<string, unknown>): ToolForm {
  const form = { ...EMPTY }
  for (const key of Object.keys(EMPTY) as (keyof ToolForm)[]) {
    const value = record[key]
    if (Array.isArray(EMPTY[key])) (form[key] as unknown) = Array.isArray(value) ? value : []
    else if (typeof EMPTY[key] === 'boolean') (form[key] as unknown) = Boolean(value)
    else (form[key] as unknown) = str(value)
  }
  form.has_free_plan = record.has_free_plan === true ? 'yes' : record.has_free_plan === false ? 'no' : ''
  form.features = ((record.features as Record<string, unknown>[]) ?? []).map((f) => ({
    id: str(f.id),
    feature_name: str(f.feature_name),
    feature_value: str(f.feature_value),
    verification_notes: str(f.verification_notes),
    verified_at: str(f.verified_at),
  }))
  return form
}

function toPayload(form: ToolForm, id?: string): Record<string, unknown> {
  const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    ...(id ? { id } : {}),
    name: form.name.trim(),
    slug: form.slug.trim(),
    developer: blankToNull(form.developer),
    website_url: blankToNull(form.website_url),
    logo_url: blankToNull(form.logo_url),
    short_description: form.short_description.trim(),
    description: form.description,
    primary_category_id: blankToNull(form.primary_category_id),
    category_ids: form.category_ids,
    use_case_ids: form.use_case_ids,
    keywords: form.keywords,
    pricing_type: form.pricing_type,
    starting_price: form.starting_price.trim() === '' ? null : Number(form.starting_price.replace(',', '.')),
    currency: blankToNull(form.currency.toUpperCase()),
    price_period: blankToNull(form.price_period),
    has_free_plan: form.has_free_plan === 'yes' ? true : form.has_free_plan === 'no' ? false : null,
    free_plan_limits: blankToNull(form.free_plan_limits),
    pricing_notes: blankToNull(form.pricing_notes),
    platforms: form.platforms,
    capabilities: form.capabilities,
    macedonian_support: form.macedonian_support,
    skill_level: blankToNull(form.skill_level),
    best_for: blankToNull(form.best_for),
    features: form.features
      .filter((f) => f.feature_name.trim())
      .map((f) => ({ ...(f.id ? { id: f.id } : {}), feature_name: f.feature_name, feature_value: f.feature_value, verification_notes: f.verification_notes, verified_at: f.verified_at || null })),
    pros: form.pros,
    cons: form.cons,
    editorial_verdict: blankToNull(form.editorial_verdict),
    status: form.status,
    is_featured: form.is_featured,
    is_sponsored: form.is_sponsored,
    sponsor_note: blankToNull(form.sponsor_note),
    next_review_at: blankToNull(form.next_review_at),
    seo_title: blankToNull(form.seo_title),
    seo_description: blankToNull(form.seo_description),
  }
}

export function validateTool(form: ToolForm): string[] {
  const errors: string[] = []
  if (!form.name.trim()) errors.push('Името е задолжително.')
  if (!SLUG_PATTERN.test(form.slug)) errors.push('Слагот смее да содржи само мали латинични букви, бројки и цртички.')
  if (form.website_url && !/^https:\/\/\S+$/.test(form.website_url.trim())) errors.push('Официјалната адреса мора да почнува со https://')
  if (form.logo_url && !/^https:\/\/\S+$/.test(form.logo_url.trim())) errors.push('Адресата на логото мора да почнува со https://')
  if (form.short_description.length > 280) errors.push('Краткиот опис може да има најмногу 280 знаци.')
  if (form.starting_price && Number.isNaN(Number(form.starting_price.replace(',', '.')))) errors.push('Почетната цена мора да е број.')
  if (form.starting_price && !/^[A-Za-z]{3}$/.test(form.currency)) errors.push('Почетната цена бара валута од три букви (EUR, USD, MKD).')
  if (form.status === 'published') {
    if (!form.website_url) errors.push('За објавување е потребна официјална адреса.')
    if (form.short_description.trim().length < 20) errors.push('За објавување е потребен краток опис од најмалку 20 знаци.')
    if (!form.primary_category_id) errors.push('За објавување е потребна главна категорија.')
  }
  if (form.is_sponsored && !form.sponsor_note.trim()) errors.push('Спонзорираната алатка бара објаснување за спонзорството (се прикажува јавно).')
  if (form.seo_title.length > 70) errors.push('SEO насловот може да има најмногу 70 знаци.')
  if (form.seo_description.length > 170) errors.push('SEO описот може да има најмногу 170 знаци.')
  return errors
}

function VerificationPanel({ id, meta, onChange }: { id: string; meta: ToolMeta; onChange: () => void }) {
  const toast = useToast()
  const [note, setNote] = useState('')
  const [nextReview, setNextReview] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: 'verify' | 'flag') {
    setBusy(true)
    try {
      if (action === 'verify') await adminApi.verifyTool(id, note, nextReview || null)
      else await adminApi.flagTool(id, note)
      toast('success', action === 'verify' ? 'Алатката е означена како проверена.' : 'Алатката е означена за ажурирање.')
      setNote('')
      onChange()
    } catch (error) {
      toast('error', (error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Проверка на податоците">
      <VerificationBadge status={meta.verification_status} date={meta.last_verified_at} />
      {meta.verification_notes ? <p className="mt-2 text-xs text-graphite">Белешка: {meta.verification_notes}</p> : null}
      <p className="mt-3 text-xs text-graphite">
        Пред да означиш „проверено“, спореди ги цената, бесплатниот план, платформите и функциите со официјалната страница. Зачувај ги промените пред проверка.
      </p>
      <label htmlFor="verify-note" className="mt-3 mb-1 block text-sm font-medium">
        Белешка (извор, што е проверено)
      </label>
      <textarea id="verify-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={controlClass} />
      <label htmlFor="verify-next" className="mt-2 mb-1 block text-sm font-medium">
        Следна проверка
      </label>
      <input id="verify-next" type="date" value={nextReview} onChange={(e) => setNextReview(e.target.value)} className={controlClass} />
      <p className="mt-1 text-xs text-graphite">Ако е празно: за 90 дена.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => run('verify')}>
          <BadgeCheck className="h-4 w-4" aria-hidden /> Означи проверено
        </Button>
        <Button size="sm" variant="secondary" disabled={busy || note.trim().length < 5} onClick={() => run('flag')}>
          <Flag className="h-4 w-4" aria-hidden /> Треба ажурирање
        </Button>
      </div>
      {meta.history.length ? (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer font-medium">Историја на промени ({meta.history.length})</summary>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {meta.history.map((item) => (
              <li key={item.id} className="border-b border-ink/10 pb-1.5">
                <span className="font-mono">{formatShortDate(item.verified_at)}</span> · <strong>{item.field_changed}</strong>
                <span className="block text-graphite">{item.note ?? `${item.old_value ?? '—'} → ${item.new_value ?? '—'}`}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  )
}

export function ToolEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const me = useAdmin()
  const [form, setForm] = useState<ToolForm>(EMPTY)
  const [meta, setMeta] = useState<ToolMeta | null>(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(id))
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const options = useAsync(() => adminApi.options(), [])
  const record = useAsync(() => (id ? adminApi.getTool(id) : Promise.resolve(null)), [id])

  useEffect(() => {
    if (record.data) {
      setForm(fromRecord(record.data))
      setMeta({
        verification_status: record.data.verification_status as VerificationStatus,
        last_verified_at: (record.data.last_verified_at as string) ?? null,
        verification_notes: (record.data.verification_notes as string) ?? null,
        history: (record.data.history as ToolMeta['history']) ?? [],
      })
      setDirty(false)
    }
  }, [record.data])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = <K extends keyof ToolForm>(key: K, value: ToolForm[K]) => {
    setDirty(true)
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'name' && !slugTouched) next.slug = slugify(String(value))
      return next
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validateTool(form)
    setErrors(found)
    if (found.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      const savedId = await adminApi.saveTool(toPayload(form, id))
      setDirty(false)
      toast('success', 'Алатката е зачувана.')
      if (!id) navigate(`/admin/alatki/${savedId}`, { replace: true })
      else record.reload()
    } catch (error) {
      setErrors([(error as Error).message])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || !window.confirm(`Трајно да се избрише „${form.name}“? Ова не може да се врати.`)) return
    try {
      await adminApi.remove('tools', id)
      toast('success', 'Алатката е избришана.')
      navigate('/admin/alatki')
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }

  if ((id && record.loading && !record.data) || options.loading) return <LoadingRows />
  if (record.error || options.error) return <ErrorBox message={(record.error || options.error)!} onRetry={() => { record.reload(); options.reload() }} />
  if (id && !record.data) return <ErrorBox message="Алатката не е пронајдена." />

  const opts = options.data!
  const categoryOptions = opts.categories.map((c) => ({ value: c.id, label: c.name }))

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminPageHeader
        title={id ? form.name || 'Алатка' : 'Нова алатка'}
        description={id ? <StatusBadge status={form.status} /> : 'Новите алатки се зачувуваат како нацрт додека не ги објавиш.'}
        actions={
          <>
            {id ? (
              <a href={`/alatka/${form.slug}?preview=1`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 border border-ink px-3 text-sm hover:bg-cream">
                <Eye className="h-4 w-4" aria-hidden /> Преглед
              </a>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? 'Се зачувува…' : 'Зачувај'}
            </Button>
          </>
        }
      />

      {errors.length ? (
        <div role="alert" className="mb-6 border-l-4 border-tomato bg-white px-4 py-3 text-sm">
          <p className="font-medium">Поправи ги следниве работи:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Основно">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Име" required value={form.name} onChange={(v) => set('name', v)} max={120} />
              <TextField
                label="Слаг (URL)"
                required
                value={form.slug}
                onChange={(v) => {
                  setSlugTouched(true)
                  set('slug', v)
                }}
                hint={`/alatka/${form.slug || '…'}`}
              />
              <TextField label="Производител" value={form.developer} onChange={(v) => set('developer', v)} />
              <TextField label="Официјална адреса" type="url" value={form.website_url} onChange={(v) => set('website_url', v)} placeholder="https://" />
            </div>
            <div className="mt-4">
              <ImageUpload label="Лого" value={form.logo_url} onChange={(v) => set('logo_url', v)} folder="logos" name={form.slug || 'alatka'} hint="Користи само официјално лого од производителот." />
            </div>
            <div className="mt-4 space-y-4">
              <TextArea label="Краток опис" required value={form.short_description} onChange={(v) => set('short_description', v)} rows={2} max={280} hint="Една-две реченици: што прави алатката. Се прикажува на картичките." />
              <MarkdownField label="Детален опис" value={form.description} onChange={(v) => set('description', v)} rows={10} />
            </div>
          </Panel>

          <Panel title="Категоризација">
            <div className="space-y-4">
              <SelectField
                label="Главна категорија"
                value={form.primary_category_id}
                onChange={(v) => set('primary_category_id', v)}
                options={[{ value: '', label: '— избери —' }, ...categoryOptions]}
              />
              <CheckboxGroup label="Дополнителни категории" options={categoryOptions} value={form.category_ids} onChange={(v) => set('category_ids', v)} columns={3} />
              <CheckboxGroup label="Намени (за филтри и прашалник)" options={opts.use_cases.map((u) => ({ value: u.id, label: u.name }))} value={form.use_case_ids} onChange={(v) => set('use_case_ids', v)} columns={3} />
              <ListEditor label="Клучни зборови за пребарување" value={form.keywords} onChange={(v) => set('keywords', v)} placeholder="на пр. чатгпт" hint="Синоними и правописни варијанти, вклучително на кирилица." />
            </div>
          </Panel>

          <Panel title="Цени и бесплатен план">
            <p className="mb-4 text-xs text-graphite">Внеси само податоци проверени на официјалната страница. Јавно се прикажуваат како факт дури по „Означи проверено“.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Модел на плаќање"
                value={form.pricing_type}
                onChange={(v) => set('pricing_type', (v || 'unknown') as PricingType)}
                options={(Object.keys(pricingLabels) as PricingType[]).map((value) => ({ value, label: pricingLabels[value] }))}
              />
              <SelectField
                label="Бесплатен план"
                value={form.has_free_plan}
                onChange={(v) => set('has_free_plan', v)}
                options={[
                  { value: '', label: 'Непознато' },
                  { value: 'yes', label: 'Да' },
                  { value: 'no', label: 'Не' },
                ]}
              />
              <TextField label="Почетна цена" value={form.starting_price} onChange={(v) => set('starting_price', v)} placeholder="на пр. 20" />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Валута" value={form.currency} onChange={(v) => set('currency', v.toUpperCase())} placeholder="EUR" />
                <SelectField
                  label="Период"
                  value={form.price_period}
                  onChange={(v) => set('price_period', v)}
                  options={[{ value: '', label: '—' }, ...(Object.keys(pricePeriodLabels) as PricePeriod[]).map((value) => ({ value, label: pricePeriodLabels[value] }))]}
                />
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <TextArea label="Ограничувања на бесплатниот план" value={form.free_plan_limits} onChange={(v) => set('free_plan_limits', v)} rows={2} />
              <TextArea label="Белешки за цената" value={form.pricing_notes} onChange={(v) => set('pricing_notes', v)} rows={2} hint="На пр. студентски попуст, цени по корисник, ДДВ." />
            </div>
          </Panel>

          <Panel title="Платформи и можности">
            <div className="space-y-4">
              <CheckboxGroup label="Платформи" options={PLATFORMS.map((p) => ({ value: p, label: platformLabels[p] }))} value={form.platforms} onChange={(v) => set('platforms', v)} columns={3} />
              <CheckboxGroup label="Потврдени можности" options={CAPABILITIES.map((c) => ({ value: c, label: capabilityLabels[c] }))} value={form.capabilities} onChange={(v) => set('capabilities', v)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Поддршка за македонски"
                  value={form.macedonian_support}
                  onChange={(v) => set('macedonian_support', (v || 'unknown') as LanguageSupport)}
                  options={(Object.keys(languageSupportLabels) as LanguageSupport[]).map((value) => ({ value, label: languageSupportLabels[value] }))}
                />
                <SelectField
                  label="Ниво на сложеност"
                  value={form.skill_level}
                  onChange={(v) => set('skill_level', v)}
                  options={[{ value: '', label: 'Не е оценето' }, ...(Object.keys(skillLabels) as SkillLevel[]).map((value) => ({ value, label: skillLabels[value] }))]}
                />
              </div>
              <TextField label="За кого е" value={form.best_for} onChange={(v) => set('best_for', v)} />
            </div>
          </Panel>

          <Panel
            title="Главни функции"
            actions={
              <button type="button" className="inline-flex items-center gap-1 text-xs underline" onClick={() => set('features', [...form.features, { feature_name: '', feature_value: '', verification_notes: '', verified_at: '' }])}>
                <Plus className="h-3.5 w-3.5" /> Додај функција
              </button>
            }
          >
            {form.features.length ? (
              <ol className="space-y-3">
                {form.features.map((feature, index) => {
                  const update = (patch: Partial<FeatureRow>) => set('features', form.features.map((f, i) => (i === index ? { ...f, ...patch } : f)))
                  return (
                    <li key={feature.id || `new-${index}`} className="grid gap-2 border border-ink/15 bg-paper p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <input aria-label="Функција" placeholder="Функција" value={feature.feature_name} onChange={(e) => update({ feature_name: e.target.value })} className={controlClass} />
                      <input aria-label="Опис / вредност" placeholder="Опис / вредност" value={feature.feature_value} onChange={(e) => update({ feature_value: e.target.value })} className={controlClass} />
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Нагоре" disabled={index === 0} onClick={() => set('features', move(form.features, index, -1))} className="p-1.5 disabled:opacity-30">
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label="Отстрани" onClick={() => set('features', form.features.filter((_, i) => i !== index))} className="p-1.5 text-tomato-ink">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                        <Checkbox
                          label={feature.verified_at ? `Проверено ${formatDate(feature.verified_at)}` : 'Проверено'}
                          checked={Boolean(feature.verified_at)}
                          onChange={(checked) => update({ verified_at: checked ? new Date().toISOString() : '' })}
                        />
                        <input aria-label="Белешка за проверка" placeholder="Извор / белешка (интерно)" value={feature.verification_notes} onChange={(e) => update({ verification_notes: e.target.value })} className={`${controlClass} flex-1`} />
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="text-sm text-graphite">Нема внесени функции.</p>
            )}
          </Panel>

          <Panel title="Уредничка проценка">
            <div className="space-y-4">
              <ListEditor label="Предности" value={form.pros} onChange={(v) => set('pros', v)} />
              <ListEditor label="Недостатоци и ограничувања" value={form.cons} onChange={(v) => set('cons', v)} />
              <MarkdownField label="Заклучок на уредништвото" value={form.editorial_verdict} onChange={(v) => set('editorial_verdict', v)} rows={4} hint="Мислење, јасно одвоено од фактите. Без измислени оценки." />
            </div>
          </Panel>

          <Panel title="SEO">
            <div className="grid gap-4">
              <TextField label="SEO наслов" value={form.seo_title} onChange={(v) => set('seo_title', v)} max={70} hint="Ако е празно: „Име: што е, цена и алтернативи“." />
              <TextArea label="SEO опис" value={form.seo_description} onChange={(v) => set('seo_description', v)} rows={2} max={170} hint="Ако е празно, се користи краткиот опис." />
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Објавување">
            <div className="space-y-3">
              <SelectField
                label="Статус"
                value={form.status}
                onChange={(v) => set('status', (v || 'draft') as ContentStatus)}
                options={(Object.keys(statusLabels) as ContentStatus[]).map((value) => ({ value, label: statusLabels[value] }))}
              />
              <Checkbox label="Издвоена на почетната" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
              <Checkbox label="Спонзорирана (платено истакнување)" checked={form.is_sponsored} onChange={(v) => set('is_sponsored', v)} hint="Јавно се означува како „Спонзорирано“." />
              {form.is_sponsored ? <TextArea label="Објаснување за спонзорството" value={form.sponsor_note} onChange={(v) => set('sponsor_note', v)} rows={2} /> : null}
              <TextField label="Планирана следна проверка" type="date" value={form.next_review_at.slice(0, 10)} onChange={(v) => set('next_review_at', v)} />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Се зачувува…' : 'Зачувај'}
              </Button>
            </div>
          </Panel>

          {id && meta ? <VerificationPanel id={id} meta={meta} onChange={record.reload} /> : null}

          {id && me.role === 'admin' ? (
            <Panel title="Опасна зона">
              <p className="mb-3 text-xs text-graphite">За повлекување од јавноста подобро користи статус „Архивирано“.</p>
              <Button variant="secondary" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" aria-hidden /> Избриши трајно
              </Button>
            </Panel>
          ) : null}

          <p className="text-xs text-graphite">
            <Link to="/admin/alatki" className="underline">
              ← Назад кон листата
            </Link>
          </p>
        </div>
      </div>
    </form>
  )
}
