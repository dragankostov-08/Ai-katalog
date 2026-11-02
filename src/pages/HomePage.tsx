import { ArrowRight, BookA, Search } from 'lucide-react'
import { useState } from 'react'
import { Form, Link, useLoaderData, useRouteLoaderData } from 'react-router'
import { CategoryBox } from '../components/catalog/CategoryIndex'
import { ToolCard, ToolRow } from '../components/catalog/ToolCard'
import { AdSlot } from '../components/editorial/AdSlot'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { CollectionCard } from '../components/editorial/CollectionCard'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { LearningPathCard } from '../components/editorial/LearningPathCard'
import { NewsletterSignup } from '../components/editorial/NewsletterSignup'
import { NewsWidget } from '../components/editorial/NewsList'
import { PromptCard } from '../components/editorial/PromptCard'
import { ButtonLink } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import { fetchHome } from '../lib/api'
import { plural } from '../lib/labels'
import { absoluteUrl, DEFAULT_DESCRIPTION, type RouteHandle } from '../lib/seo'
import type { HomeData, SiteData } from '../lib/types'

export async function loader({ request }: { request: Request }) {
  return fetchHome(request.signal)
}

export const handle: RouteHandle = {
  meta: () => ({
    title: '',
    description: DEFAULT_DESCRIPTION,
    path: '/',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'AI Katalog', inLanguage: 'mk', url: absoluteUrl('/') }],
  }),
}

const WIZARD_QUESTIONS = ['Што сакаш да направиш?', 'Колку искуство имаш?', 'Ти треба ли бесплатна?', 'Кои можности се неопходни?', 'Платформа и јазик?']

/** One line of the hero headline; words are animated in by GSAP (see lib/motion). */
function HeroLine({ words, className = '' }: { words: string[]; className?: string }) {
  return (
    <span className={`block ${className}`}>
      {words.map((word, index) => (
        <span key={index} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-hero-word className="inline-block">
            {word}
          </span>
          {index < words.length - 1 ? '\u00a0' : null}
        </span>
      ))}
    </span>
  )
}

function HeroSearch() {
  return (
    <Form action="/alatki" method="get" role="search" className="mx-auto mt-9 max-w-2xl">
      <label htmlFor="hero-search" className="sr-only">
        Пребарај AI алатки по име, задача или категорија
      </label>
      <div className="glass flex items-center rounded-full border p-1.5 shadow-offset transition-[border-color,box-shadow] focus-within:border-white/25 focus-within:ring-4 focus-within:ring-white/5">
        <Search className="ml-3 h-5 w-5 shrink-0 text-mid" aria-hidden />
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="На пр. превод, презентација, видео…"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base placeholder:text-mid focus:outline-none"
        />
        <button type="submit" className="h-11 shrink-0 rounded-full bg-tomato px-5 text-sm font-semibold text-paper hover:bg-white md:px-7">
          Пребарај
        </button>
      </div>
    </Form>
  )
}

export function Component() {
  const home = useLoaderData() as HomeData
  const site = useRouteLoaderData('root') as SiteData
  const activeCategories = site.categories.filter((category) => category.tool_count > 0)
  const [tab, setTab] = useState<'recent' | 'featured'>('recent')
  const listed = tab === 'recent' || !home.featured_tools.length ? home.recent_tools : home.featured_tools

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-light">
        <div className="container-page pt-16 pb-14 text-center md:pt-28 md:pb-24">
          <p data-hero-fade className="inline-flex items-center gap-2 rounded-full border border-light bg-surface px-3.5 py-1.5 text-xs font-medium tracking-wide text-graphite backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            {home.tool_count > 0
              ? `${home.tool_count} ${plural(home.tool_count, 'алатка', 'алатки')} · ${activeCategories.length} ${plural(activeCategories.length, 'категорија', 'категории')} · на македонски`
              : 'Каталогот се пополнува'}
          </p>
          <h1 className="mx-auto mt-7 max-w-5xl text-[2.6rem] leading-[1.02] font-medium tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            <HeroLine words={['Најди', 'ја', 'вистинската']} />
            <HeroLine words={['AI', 'алатка.']} className="text-mid" />
          </h1>
          <p data-hero-fade className="mx-auto mt-6 max-w-xl text-base text-graphite md:text-lg">
            Каталог, споредби, готови промптови и вести за вештачка интелигенција — проверено и објаснето на македонски.
          </p>
          <div data-hero-fade>
            <HeroSearch />
          </div>
          {site.use_cases.length ? (
            <ul data-hero-fade className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Популарни задачи">
              {site.use_cases.slice(0, 8).map((useCase) => (
                <li key={useCase.slug}>
                  <Link
                    to={`/alatki?namena=${useCase.slug}`}
                    className="inline-flex rounded-full border border-light bg-surface px-3 py-1.5 text-sm text-graphite transition-colors hover:border-white/25 hover:text-ink"
                  >
                    {useCase.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {home.tool_count === 0 ? (
        <div className="container-page mt-8">
          <div className="rounded-2xl border border-warn/30 bg-warn-soft px-5 py-4 text-sm">
            <p className="font-semibold">Уредниците ги проверуваат првите алатки.</p>
            <p className="mt-1 text-graphite">
              Секоја алатка се објавува откако ќе ги провериме описот, цените и условите на официјалната страница. Во меѓувреме погледни ги{' '}
              <Link to="/vodici" className="underline">
                водичите
              </Link>{' '}
              или{' '}
              <Link to="/predlozi" className="underline">
                предложи алатка
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      {/* Latest tools + news */}
      {home.recent_tools.length || home.news.length ? (
        <section data-reveal className="container-page mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-label="Најново">
          {home.recent_tools.length ? (
            <div className="rounded-2xl border border-light bg-surface p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-2">
                <div role="tablist" aria-label="Листа на алатки" className="inline-flex rounded-full bg-cream p-1">
                  {(
                    [
                      ['recent', 'Најнови AI алатки'],
                      ['featured', 'Избор на уредништвото'],
                    ] as const
                  )
                    .filter(([key]) => key === 'recent' || home.featured_tools.length)
                    .map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? 'bg-white/10 text-ink' : 'text-graphite hover:text-ink'}`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
                <Link to={tab === 'recent' ? '/alatki?sort=novi' : '/alatki?sort=izbor'} className="text-sm font-medium text-graphite hover:text-ink">
                  Сите →
                </Link>
              </div>
              <ul className="grid sm:grid-cols-2 sm:gap-x-2">
                {listed.slice(0, 10).map((tool) => (
                  <ToolRow key={tool.id} tool={tool} showDate={tab === 'recent'} />
                ))}
              </ul>
            </div>
          ) : null}
          {home.news.length ? (
            <NewsWidget items={home.news} />
          ) : (
            <div className="glass-panel flex flex-col justify-between rounded-2xl p-6">
              <div>
                <p className="text-sm font-medium text-tomato-ink">Прашалник · 5 прашања</p>
                <p className="mt-2 text-2xl leading-tight font-semibold">Не знаеш која алатка ти треба?</p>
              </div>
              <Link to="/pronajdi" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-tomato px-5 text-sm font-semibold text-paper hover:bg-white">
                Започни <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {/* Categories with their top tools */}
      {home.category_tools.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-categories">
          <SectionHeader id="home-categories" title="AI алатки по категорија" description="Најдобрите алатки во секоја област, на едно место." link={{ to: '/kategorii', label: 'Сите категории' }} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.category_tools.map((category) => (
              <li key={category.slug}>
                <CategoryBox category={category} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdSlot placement="home" className="container-page mt-12" />

      {/* Featured */}
      {home.featured_tools.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-featured">
          <SectionHeader id="home-featured" title="Избор на уредништвото" description="Добра почетна точка во својата категорија." link={{ to: '/alatki?sort=izbor', label: 'Види повеќе' }} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {home.featured_tools.slice(0, 8).map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Wizard band */}
      <section data-reveal className="container-page mt-14" aria-labelledby="home-wizard">
        <div className="glass-panel grid gap-8 overflow-hidden rounded-3xl px-6 py-10 md:grid-cols-2 md:px-12 md:py-14">
          <div>
            <p className="text-sm font-medium text-tomato-ink">Прашалник · без регистрација</p>
            <h2 id="home-wizard" className="mt-2 text-3xl leading-tight font-semibold md:text-4xl">
              Не знаеш која алатка ти треба?
            </h2>
            <p className="mt-3 max-w-md text-graphite">Пет кратки прашања. Препораките се засноваат на проверени податоци и за секоја алатка гледаш зошто е предложена.</p>
            <Link to="/pronajdi" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-tomato px-6 font-semibold text-paper hover:bg-white">
              Започни <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ol className="grid gap-2 self-center">
            {WIZARD_QUESTIONS.map((question, index) => (
              <li key={question} className="flex items-center gap-3 rounded-xl border border-light bg-cream px-4 py-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-light font-code text-xs text-graphite">{index + 1}</span>
                <span className="font-medium">{question}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Professions */}
      {home.audience_collections.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-audiences">
          <SectionHeader id="home-audiences" title="AI алатки за твојата професија" link={{ to: '/najdobri', label: 'Сите листи' }} />
          <ul className="flex flex-wrap gap-3">
            {home.audience_collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  to={`/najdobri/${collection.slug}`}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-light bg-surface px-4 py-3 shadow-sm hover:border-white/20 hover:shadow-offset-sm"
                >
                  <span className="font-bold">{collection.audience_label ?? collection.title}</span>
                  <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-graphite">{collection.tool_count}</span>
                  <ArrowRight className="h-4 w-4 text-mid transition-transform group-hover:translate-x-0.5 group-hover:text-tomato" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Prompts */}
      {home.prompts.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-prompts">
          <SectionHeader id="home-prompts" title="Готови промптови на македонски" description="Копирај, прилагоди и залепи во AI асистентот." link={{ to: '/promptovi', label: 'Сите промптови' }} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.prompts.map((prompt) => (
              <li key={prompt.id}>
                <PromptCard prompt={prompt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Comparisons */}
      {home.comparisons.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-comparisons">
          <SectionHeader id="home-comparisons" title="Споредби" link={{ to: '/sporedbi', label: 'Сите споредби' }} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {home.comparisons.map((comparison) => (
              <li key={comparison.id}>
                <ComparisonCard comparison={comparison} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Learn */}
      {home.learning_paths.length || home.articles.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-learn">
          <SectionHeader id="home-learn" title="Учи да ги користиш" link={{ to: '/vodici', label: 'Сите водичи' }} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {home.learning_paths.slice(0, 1).map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
            {home.articles.slice(0, home.learning_paths.length ? 2 : 3).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            <div className="flex flex-col justify-between rounded-2xl border border-light bg-surface p-5 shadow-sm">
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-info-soft text-info">
                  <BookA className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 text-lg font-bold">AI речник</p>
                <p className="mt-1 text-sm text-graphite">Токен, промпт, халуцинација, RAG — поимите објаснети на македонски.</p>
              </div>
              <ButtonLink to="/recnik" variant="secondary" className="mt-4">
                Отвори го речникот
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {/* Lists */}
      {home.collections.length ? (
        <section data-reveal className="container-page mt-14" aria-labelledby="home-collections">
          <SectionHeader id="home-collections" title="Најдобри листи" description="Уреднички избор со објаснета методологија. Позициите не се продаваат." link={{ to: '/najdobri', label: 'Сите листи' }} />
          <ul className="grid gap-4 md:grid-cols-3">
            {home.collections.map((collection) => (
              <li key={collection.id}>
                <CollectionCard collection={collection} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Newsletter */}
      <section data-reveal className="container-page mt-14" aria-labelledby="home-newsletter">
        <div className="grid gap-6 rounded-3xl border border-light bg-surface p-6 shadow-sm md:grid-cols-[1fr_1.2fr] md:items-center md:p-10">
          <div>
            <h2 id="home-newsletter" className="text-2xl font-semibold tracking-tight">
              Новото во AI, еднаш неделно
            </h2>
            <p className="mt-2 text-graphite">Нови алатки, промени на цени, водичи и вести. Без спам, одјава со еден клик.</p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </>
  )
}
