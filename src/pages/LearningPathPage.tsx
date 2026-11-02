import { BookOpen, Check, Compass, Dumbbell, PlayCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLoaderData } from 'react-router'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { PreviewBanner } from '../components/editorial/Notices'
import { PromptText } from '../components/editorial/PromptText'
import { VideoCard } from '../components/editorial/VideoTutorials'
import { Button } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { fetchLearningPath } from '../lib/api'
import { skillLabels, stepTypeLabels } from '../lib/labels'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown } from '../lib/markdown'
import { resetProgress, toggleStep, useProgress } from '../lib/progress'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { LearningPathData, StepType } from '../lib/types'

type PathPageData = LearningPathData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<PathPageData> {
  const preview = isPreview(request)
  const detail = await fetchLearningPath(params.slug ?? '', preview, request.signal)
  if (!detail || (!detail.steps.length && !preview)) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<PathPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { path } = data
    const url = `/patki/${path.slug}`
    return {
      title: path.seo_title || path.title,
      description: path.seo_description || path.summary,
      path: url,
      noindex: data.preview,
      modifiedTime: path.updated_at,
      jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Патеки за учење', path: '/patki' }, { name: path.title, path: url }])],
    }
  },
}

const icons: Record<StepType, typeof BookOpen> = { read: BookOpen, watch: PlayCircle, practice: Dumbbell, explore: Compass }

export function Component() {
  const { path, steps, preview } = useLoaderData() as PathPageData
  const progress = useProgress()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const done = new Set(mounted ? (progress[path.slug] ?? []) : [])
  const completed = steps.filter((step) => done.has(step.id)).length
  const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0
  const nextStep = steps.find((step) => !done.has(step.id))

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Патеки за учење', path: '/patki' }, { name: path.title }]} />
      <header className="grid gap-8 border-b border-light pb-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="max-w-3xl">
          <p className="label-mono text-tomato-ink">
            Патека{path.level ? ` · ${skillLabels[path.level]}` : ''}
            {path.estimated_days ? ` · ${path.estimated_days} дена` : ''}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">{path.title}</h1>
          <p className="mt-4 text-xl leading-relaxed text-graphite">{path.summary}</p>
          {path.intro ? <Markdown source={path.intro} className="prose-ak mt-4" /> : null}
        </div>
        <aside className="self-start border border-light bg-white p-5 rounded-2xl" aria-label="Напредок">
          <p className="label-mono text-graphite">Твој напредок</p>
          <p className="mt-1 font-display text-4xl font-extrabold">{percent}%</p>
          <div className="mt-2 h-2 bg-light" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed} aria-label={`${completed} од ${steps.length} чекори`}>
            <div className="h-full bg-tomato transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm text-graphite">
            {completed} од {steps.length} чекори · се чува само во овој прелистувач
          </p>
          {nextStep ? (
            <a href={`#cekor-${nextStep.id}`} className="mt-3 inline-block text-sm font-medium underline">
              Продолжи: {nextStep.title}
            </a>
          ) : (
            <p className="mt-3 text-sm font-medium text-teal-ink">Ја заврши патеката. Браво!</p>
          )}
          {completed ? (
            <button type="button" onClick={() => resetProgress(path.slug)} className="mt-3 block text-xs text-graphite underline">
              Почни одново
            </button>
          ) : null}
        </aside>
      </header>

      <ol className="mt-10 space-y-6">
        {steps.map((step, index) => {
          const Icon = icons[step.step_type]
          const isDone = done.has(step.id)
          return (
            <li key={step.id} id={`cekor-${step.id}`} className={`scroll-mt-28 grid gap-4 border p-5 md:grid-cols-[4rem_minmax(0,1fr)] ${isDone ? 'border-light bg-paper' : 'border-light bg-white'} rounded-2xl`}>
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <span className={`inline-flex h-11 w-11 items-center justify-center font-display text-lg font-extrabold ${isDone ? 'bg-teal text-white' : 'bg-tomato text-white'}`}>
                  {isDone ? <Check className="h-5 w-5" aria-hidden /> : index + 1}
                </span>
                <span className="inline-flex items-center gap-1 label-mono text-graphite">
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {stepTypeLabels[step.step_type]}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-2xl leading-tight font-extrabold">{step.title}</h2>
                  {step.estimated_minutes ? <span className="font-mono text-xs text-graphite">~{step.estimated_minutes} мин.</span> : null}
                </div>
                {step.body ? <Markdown source={step.body} className="prose-ak mt-2 max-w-none" /> : null}
                <div className="mt-4 space-y-4">
                  {step.article ? (
                    <Link to={`/vodici/${step.article.slug}`} className="block border-l-4 border-tomato bg-paper px-4 py-3 hover:bg-cream">
                      <span className="label-mono text-graphite">Водич · {step.article.reading_minutes} мин. читање</span>
                      <span className="mt-1 block font-display text-lg font-bold">{step.article.title}</span>
                    </Link>
                  ) : null}
                  {step.tool ? (
                    <Link to={`/alatka/${step.tool.slug}`} className="flex items-center gap-3 border border-light bg-paper px-4 py-3 hover:border-brand-line rounded-2xl">
                      <ToolLogo name={step.tool.name} src={step.tool.logo_url} size="sm" />
                      <span>
                        <span className="label-mono text-graphite">Алатка</span>
                        <span className="block font-display font-bold">{step.tool.name}</span>
                      </span>
                    </Link>
                  ) : null}
                  {step.prompt ? (
                    <div>
                      <p className="mb-2 text-sm">
                        Промпт:{' '}
                        <Link to={`/promptovi/${step.prompt.slug}`} className="font-medium underline">
                          {step.prompt.title}
                        </Link>
                      </p>
                      <PromptText text={step.prompt.prompt_text} compact />
                    </div>
                  ) : null}
                  {step.video ? (
                    <div className="max-w-xl">
                      <VideoCard video={step.video} index={index} as="div" />
                    </div>
                  ) : null}
                </div>
                <Button variant={isDone ? 'secondary' : 'primary'} size="sm" className="mt-5" onClick={() => toggleStep(path.slug, step.id)} aria-pressed={isDone}>
                  {isDone ? 'Означи како незавршено' : 'Означи како завршено'}
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
