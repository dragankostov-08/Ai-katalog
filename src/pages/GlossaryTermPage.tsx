import { Link, useLoaderData } from 'react-router'
import { ToolGrid } from '../components/catalog/ToolGrid'
import { PreviewBanner } from '../components/editorial/Notices'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SectionHeader } from '../components/ui/SectionHeader'
import { fetchGlossaryTerm } from '../lib/api'
import { isPreview, notFound } from '../lib/loaders'
import { Markdown } from '../lib/markdown'
import { breadcrumbJsonLd, notFoundMeta, type RouteHandle } from '../lib/seo'
import type { GlossaryTermData } from '../lib/types'

type TermPageData = GlossaryTermData & { preview: boolean }

export async function loader({ request, params }: { request: Request; params: { slug?: string } }): Promise<TermPageData> {
  const preview = isPreview(request)
  const detail = await fetchGlossaryTerm(params.slug ?? '', preview, request.signal)
  if (!detail) notFound()
  return { ...detail, preview }
}

export const handle: RouteHandle<TermPageData> = {
  meta: ({ data }) => {
    if (!data) return notFoundMeta
    const { term } = data
    const path = `/recnik/${term.slug}`
    return {
      title: term.seo_title || `Што е ${term.term.toLowerCase()}? — AI речник`,
      description: term.seo_description || term.short_definition,
      path,
      noindex: data.preview,
      modifiedTime: term.updated_at,
      jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'AI речник', path: '/recnik' }, { name: term.term, path }])],
    }
  },
}

export function Component() {
  const { term, related, tools, preview } = useLoaderData() as TermPageData
  return (
    <article className="container-page pt-8 md:pt-12">
      {preview ? <PreviewBanner /> : null}
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'AI речник', path: '/recnik' }, { name: term.term }]} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 max-w-3xl">
          <p className="label-mono text-tomato-ink">AI речник{term.english_term ? ` · ${term.english_term}` : ''}</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.1] font-extrabold tracking-tight md:text-6xl">{term.term}</h1>
          <p className="mt-6 border-l-4 border-light pl-4 text-xl leading-relaxed md:text-2xl">{term.short_definition}</p>
          {term.body ? <Markdown source={term.body} className="prose-ak mt-8" /> : null}
        </div>
        <aside className="space-y-6 self-start">
          {related.length ? (
            <div>
              <h2 className="label-mono mb-2 text-graphite">Поврзани поими</h2>
              <ul className="divide-y divide-light border-y border-light">
                {related.map((item) => (
                  <li key={item.slug} className="py-2.5">
                    <Link to={`/recnik/${item.slug}`} className="font-display font-bold hover:underline hover:decoration-tomato hover:underline-offset-4">
                      {item.term}
                    </Link>
                    <p className="line-clamp-2 text-sm text-graphite">{item.short_definition}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link to="/recnik" className="inline-block text-sm underline">
            ← Сите поими
          </Link>
        </aside>
      </div>
      {tools.length ? (
        <section className="mt-16" aria-labelledby="term-tools">
          <SectionHeader id="term-tools" index="Во пракса" title="Алатки поврзани со овој поим" />
          <ToolGrid tools={tools} columns={4} />
        </section>
      ) : null}
    </article>
  )
}
