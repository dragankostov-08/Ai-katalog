import { Link, useLoaderData } from 'react-router'
import { ToolGrid } from '../components/catalog/ToolGrid'
import { PreviewBanner } from '../components/editorial/Notices'
import { PromptCard } from '../components/editorial/PromptCard'
import { PromptText } from '../components/editorial/PromptText'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SectionHeader } from '../components/ui/SectionHeader'
import { fetchPrompt } from '../lib/api'
import { formatDate } from '../lib/format'
import { skillLabels } from '../lib/labels'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { PromptDetailData } from '../lib/types'

type PromptPageData = PromptDetailData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<PromptPageData> {
  const preview = isPreview(request)
  const detail = await fetchPrompt(params.slug ?? '', preview, request.signal)
  if (!detail) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<PromptPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { prompt } = data
    const path = `/promptovi/${prompt.slug}`
    return {
      title: prompt.seo_title || `Промпт: ${prompt.title}`,
      description: prompt.seo_description || prompt.summary,
      path,
      noindex: data.preview,
      modifiedTime: prompt.updated_at,
      jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'Промптови', path: '/promptovi' }, { name: prompt.title, path }])],
    }
  },
}

export function Component() {
  const { prompt, tools, related, preview } = useLoaderData() as PromptPageData

  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Промптови', path: '/promptovi' }, { name: prompt.title }]} />
      <header className="max-w-3xl">
        <p className="label-mono text-tomato-ink">
          {prompt.use_case ? (
            <Link to={`/promptovi?namena=${prompt.use_case.slug}`} className="hover:underline">
              {prompt.use_case.name}
            </Link>
          ) : (
            'Промпт'
          )}
          {prompt.skill_level ? ` · ${skillLabels[prompt.skill_level]}` : ''}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-5xl">{prompt.title}</h1>
        <p className="mt-4 font-serif text-xl leading-relaxed text-graphite italic">{prompt.summary}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <PromptText text={prompt.prompt_text} />
          {prompt.how_to_use ? (
            <section aria-labelledby="prompt-how">
              <h2 id="prompt-how" className="mb-3 border-t border-ink pt-3 font-display text-2xl font-extrabold">
                Како да го користиш
              </h2>
              <Markdown source={prompt.how_to_use} />
            </section>
          ) : null}
          {prompt.example_output ? (
            <section aria-labelledby="prompt-example">
              <h2 id="prompt-example" className="mb-3 border-t border-ink pt-3 font-display text-2xl font-extrabold">
                Пример за резултат
              </h2>
              <p className="mb-3 text-sm text-graphite">Резултатите се разликуваат меѓу алатките и при секое ново барање.</p>
              <div className="border-l-4 border-mustard bg-white px-5 py-4">
                <Markdown source={prompt.example_output} />
              </div>
            </section>
          ) : null}
        </div>
        <aside className="space-y-4 self-start border border-ink/25 bg-white p-5 text-sm">
          <p className="label-mono text-graphite">Пред да го користиш</p>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Не внесувај лични или доверливи податоци.</li>
            <li>Провери ги фактите, бројките и имињата во одговорот.</li>
            <li>Ако резултатот не ти одговара, побарај конкретна измена наместо нов промпт.</li>
          </ul>
          <p className="font-mono text-xs text-graphite">Ажурирано {formatDate(prompt.updated_at)}</p>
          <Link to="/vodici/kako-da-napishesh-dobar-prompt" className="block underline">
            Како се пишува добар промпт →
          </Link>
        </aside>
      </div>

      {tools.length ? (
        <section className="mt-16" aria-labelledby="prompt-tools">
          <SectionHeader id="prompt-tools" index="Каде да го пробаш" title="Алатки за овој промпт" />
          <ToolGrid tools={tools} columns={tools.length > 3 ? 4 : 3} />
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-16" aria-labelledby="prompt-related">
          <SectionHeader id="prompt-related" index="Слични" title="Поврзани промптови" link={{ to: '/promptovi', label: 'Сите промптови' }} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <PromptCard prompt={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
