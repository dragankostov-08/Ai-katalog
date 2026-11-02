import { ArrowRight, BookA, Search, Sparkles } from 'lucide-react'
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

function HeroSearch() {
  return (
    <Form action="/alatki" method="get" role="search" className="mx-auto mt-8 max-w-2xl">
      <label htmlFor="hero-search" className="sr-only">
        Пребарај AI алатки по име, задача или категорија
      </label>
      <div className="flex items-center rounded-full border border-light bg-white p-1.5 shadow-offset focus-within:border-tomato focus-within:ring-4 focus-within:ring-brand-soft">
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
        <button type="submit" className="h-11 shrink-0 rounded-full bg-tomato px-5 text-sm font-semibold text-white hover:bg-tomato-ink md:px-7">
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
      <section className="hero-glow border-b border-light">
        <div className="container-page pt-12 pb-10 text-center md:pt-16 md:pb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-sm font-medium text-tomato-ink shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
            {home.tool_count > 0
              ? `${home.tool_count} ${plural(home.tool_count, 'алатка', 'алатки')} · ${activeCategories.length} ${plural(activeCategories.length, 'категорија', 'категории')} · на македонски`
              : 'Каталогот се пополнува'}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl leading-[1.08] font-extrabold tracking-tight md:text-6xl">
            Најди ја вистинската <span className="bg-linear-to-r from-[#7c3aed] to-[#0ea5e9] bg-clip-text text-transparent">AI алатка</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-graphite">
            Каталог, споредби, готови промптови и вести за вештачка интелигенција — проверено и објаснето на македонски.
          </p>
          <HeroSearch />
          {site.use_cases.length ? (
            <ul className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2" aria-label="Популарни задачи">
              {site.use_cases.slice(0, 8).map((useCase) => (
                <li key={useCase.slug}>
                  <Link
                    to={`/alatki?namena=${useCase.slug}`}
                    className="inline-flex rounded-full border border-light bg-white px-3 py-1.5 text-sm text-graphite shadow-sm hover:border-brand-line hover:text-tomato-ink"
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
        <section className="container-page mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-label="Најново">
          {home.recent_tools.length ? (
            <div className="rounded-2xl border border-light bg-white p-3 shadow-sm">
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
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? 'bg-white text-ink shadow-sm' : 'text-graphite hover:text-ink'}`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
                <Link to={tab === 'recent' ? '/alatki?sort=novi' : '/alatki?sort=izbor'} className="text-sm font-semibold text-tomato-ink hover:text-tomato">
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
            <div className="flex flex-col justify-between rounded-2xl brand-gradient p-6 text-white shadow-sm">
              <div>
                <p className="text-sm font-semibold text-white/80">Прашалник · 5 прашања</p>
                <p className="mt-2 text-2xl leading-tight font-extrabold">Не знаеш која алатка ти треба?</p>
              </div>
              <Link to="/pronajdi" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-tomato-ink">
                Започни <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {/* Categories with their top tools */}
      {home.category_tools.length ? (
        <section className="container-page mt-14" aria-labelledby="home-categories">
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
        <section className="container-page mt-14" aria-labelledby="home-featured">
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
      <section className="container-page mt-14" aria-labelledby="home-wizard">
        <div className="grid gap-8 overflow-hidden rounded-3xl brand-gradient px-6 py-10 text-white shadow-offset md:grid-cols-2 md:px-12">
          <div>
            <p className="text-sm font-semibold text-white/80">Прашалник · без регистрација</p>
            <h2 id="home-wizard" className="mt-2 text-3xl leading-tight font-extrabold md:text-4xl">
              Не знаеш која алатка ти треба?
            </h2>
            <p className="mt-3 max-w-md text-white/85">Пет кратки прашања. Препораките се засноваат на проверени податоци и за секоја алатка гледаш зошто е предложена.</p>
            <Link to="/pronajdi" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-tomato-ink shadow-sm hover:bg-brand-soft">
              Започни <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ol className="grid gap-2 self-center">
            {WIZARD_QUESTIONS.map((question, index) => (
              <li key={question} className="flex items-center gap-3 rounded-xl bg-white/12 px-4 py-3 backdrop-blur">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-tomato-ink">{index + 1}</span>
                <span className="font-medium">{question}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Professions */}
      {home.audience_collections.length ? (
        <section className="container-page mt-14" aria-labelledby="home-audiences">
          <SectionHeader id="home-audiences" title="AI алатки за твојата професија" link={{ to: '/najdobri', label: 'Сите листи' }} />
          <ul className="flex flex-wrap gap-3">
            {home.audience_collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  to={`/najdobri/${collection.slug}`}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-light bg-white px-4 py-3 shadow-sm hover:border-brand-line hover:shadow-offset-sm"
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
        <section className="container-page mt-14" aria-labelledby="home-prompts">
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
        <section className="container-page mt-14" aria-labelledby="home-comparisons">
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
        <section className="container-page mt-14" aria-labelledby="home-learn">
          <SectionHeader id="home-learn" title="Учи да ги користиш" link={{ to: '/vodici', label: 'Сите водичи' }} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {home.learning_paths.slice(0, 1).map((path) => (
              <LearningPathCard key={path.id} path={path} />
            ))}
            {home.articles.slice(0, home.learning_paths.length ? 2 : 3).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
            <div className="flex flex-col justify-between rounded-2xl border border-light bg-white p-5 shadow-sm">
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
        <section className="container-page mt-14" aria-labelledby="home-collections">
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
      <section className="container-page mt-14" aria-labelledby="home-newsletter">
        <div className="grid gap-6 rounded-3xl border border-light bg-white p-6 shadow-sm md:grid-cols-[1fr_1.2fr] md:items-center md:p-10">
          <div>
            <h2 id="home-newsletter" className="text-2xl font-extrabold tracking-tight">
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
