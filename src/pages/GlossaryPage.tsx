import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLoaderData } from 'react-router'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/States'
import { compareMk, LATIN_GROUP, letterOf, MK_ALPHABET } from '../lib/alphabet'
import { fetchGlossary } from '../lib/api'
import { breadcrumbJsonLd, type RouteHandle } from '../lib/seo'
import type { GlossaryEntry } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchGlossary(request.signal)

export const handle: RouteHandle<GlossaryEntry[]> = {
  meta: ({ data }) => ({
    title: 'AI речник: поими објаснети на македонски',
    description: 'Што е јазичен модел, промпт, токен, халуцинација или RAG? Кратки и јасни објаснувања на AI поимите на македонски.',
    path: '/recnik',
    noindex: !data?.length,
    jsonLd: [breadcrumbJsonLd([{ name: 'Почетна', path: '/' }, { name: 'AI речник', path: '/recnik' }])],
  }),
}

const anchorFor = (letter: string) => (letter === LATIN_GROUP ? 'latinica' : `bukva-${MK_ALPHABET.indexOf(letter.toLowerCase())}`)

export function Component() {
  const terms = useLoaderData() as GlossaryEntry[]
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const visible = terms
      .filter((t) => !needle || t.term.toLowerCase().includes(needle) || (t.english_term ?? '').toLowerCase().includes(needle) || t.short_definition.toLowerCase().includes(needle))
      .sort((a, b) => compareMk(a.term, b.term))
    const map = new Map<string, GlossaryEntry[]>()
    for (const term of visible) {
      const letter = letterOf(term.term)
      map.set(letter, [...(map.get(letter) ?? []), term])
    }
    return [...map.entries()].sort(([a], [b]) => (a === LATIN_GROUP ? 1 : b === LATIN_GROUP ? -1 : compareMk(a, b)))
  }, [terms, filter])

  const present = new Set(groups.map(([letter]) => letter))

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'AI речник' }]} />
      <header className="mb-8 max-w-3xl">
        <p className="label-mono text-tomato-ink">Речник</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">AI речник</h1>
        <p className="mt-4 text-lg text-graphite">Поимите што ги среќаваш кај AI алатките, објаснети кратко и без жаргон.</p>
      </header>

      {terms.length ? (
        <>
          <div className="mb-6 flex max-w-md border-2 border-ink bg-white">
            <Search className="ml-3 h-5 w-5 shrink-0 self-center text-graphite" aria-hidden />
            <label htmlFor="glossary-filter" className="sr-only">
              Пребарај поим
            </label>
            <input
              id="glossary-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Пребарај поим…"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 focus:outline-none"
            />
          </div>
          <nav aria-label="Букви" className="sticky top-16 z-10 -mx-4 mb-8 overflow-x-auto border-y border-ink/20 bg-paper/95 px-4 py-2 md:top-24">
            <ol className="flex gap-1 font-mono text-sm">
              {[...MK_ALPHABET.toUpperCase().split(''), LATIN_GROUP].map((letter) => (
                <li key={letter}>
                  {present.has(letter) ? (
                    <a href={`#${anchorFor(letter)}`} className="inline-flex h-8 min-w-8 items-center justify-center px-1 hover:bg-ink hover:text-paper">
                      {letter}
                    </a>
                  ) : (
                    <span aria-hidden className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-light">
                      {letter}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {groups.length ? (
            <div className="space-y-10">
              {groups.map(([letter, items]) => (
                <section key={letter} id={anchorFor(letter)} aria-labelledby={`${anchorFor(letter)}-title`} className="scroll-mt-40 grid gap-4 md:grid-cols-[5rem_1fr]">
                  <h2 id={`${anchorFor(letter)}-title`} className={`font-display leading-none font-black whitespace-nowrap text-transparent ${letter === LATIN_GROUP ? 'text-3xl' : 'text-5xl'}`} style={{ WebkitTextStroke: '1.5px var(--color-ink)' }}>
                    {letter}
                  </h2>
                  <dl className="grid gap-x-8 gap-y-5 border-t-2 border-ink pt-4 md:grid-cols-2">
                    {items.map((term) => (
                      <div key={term.slug} className="group relative">
                        <dt className="font-display text-lg font-bold">
                          <Link to={`/recnik/${term.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-tomato group-hover:underline-offset-4">
                            {term.term}
                          </Link>
                          {term.english_term ? <span className="ml-2 font-mono text-xs font-normal text-graphite">{term.english_term}</span> : null}
                        </dt>
                        <dd className="mt-1 text-[0.95rem] text-graphite">{term.short_definition}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-graphite">Нема поим што одговара на „{filter}“.</p>
          )}
        </>
      ) : (
        <EmptyState title="Речникот се подготвува">Уредниците ги проверуваат првите објаснувања.</EmptyState>
      )}
    </div>
  )
}
