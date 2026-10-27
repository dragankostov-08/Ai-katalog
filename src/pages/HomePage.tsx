import { ArrowRight, Search } from 'lucide-react'
import { Form, Link, useLoaderData, useRouteLoaderData } from 'react-router'
import { CategoryIndex } from '../components/catalog/CategoryIndex'
import { ToolCard, ToolRow } from '../components/catalog/ToolCard'
import { AdSlot } from '../components/editorial/AdSlot'
import { ArticleCard } from '../components/editorial/ArticleCard'
import { CollectionCard } from '../components/editorial/CollectionCard'
import { ComparisonCard } from '../components/editorial/ComparisonCard'
import { HeroAnnotation, HeroCollage } from '../components/editorial/HeroCollage'
import { NewsletterSignup } from '../components/editorial/NewsletterSignup'
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
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AI KATALOG',
        inLanguage: 'mk',
        url: absoluteUrl('/'),
      },
    ],
  }),
}

const WIZARD_QUESTIONS = [
  'Што сакаш да направиш?',
  'Колку искуство имаш со AI?',
  'Ти треба ли бесплатна алатка?',
  'Кои можности се неопходни?',
  'На која платформа и на кој јазик?',
]

function HeroSearch() {
  return (
    <Form action="/alatki" method="get" role="search" className="mt-8 max-w-xl">
      <label htmlFor="hero-search" className="label-mono mb-2 block text-graphite">
        Пребарај по име, задача или категорија
      </label>
      <div className="flex border-2 border-ink bg-white shadow-offset">
        <Search className="ml-4 h-5 w-5 shrink-0 self-center text-graphite" aria-hidden />
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="на пр. превод, презентација, видео…"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          className="h-14 min-w-0 flex-1 bg-transparent px-3 text-base placeholder:text-mid focus:outline-none md:text-lg"
        />
        <button type="submit" className="m-1.5 shrink-0 bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-graphite md:px-6 md:text-base">
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
  const [leadArticle, ...otherArticles] = home.articles

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink">
        <div className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-10 pt-10 pb-12 md:pt-14 lg:grid-cols-[1.12fr_1fr] lg:gap-4 lg:pb-16">
          <div className="animate-rise">
            <p className="flex flex-wrap items-center gap-2 label-mono text-graphite">
              <span aria-hidden className="h-2 w-2 bg-tomato" />
              {home.tool_count > 0
                ? `Во каталогот: ${home.tool_count} ${plural(home.tool_count, 'алатка', 'алатки')} · ${activeCategories.length} ${plural(activeCategories.length, 'категорија', 'категории')}`
                : 'Каталогот се пополнува'}
            </p>
            <h1 className="mt-5 font-display text-[3rem] leading-[0.9] font-black tracking-[-0.035em] sm:text-[4.25rem] xl:text-[5.4rem]">
              AI алатки.
              <br />
              Без бескрајно{' '}
              <span className="relative inline-block">
                барање.
                <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-tomato md:-bottom-3 md:h-4" aria-hidden>
                  <path d="M3 15c60-9 140-13 204-9 30 2 58 5 90 9" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-graphite md:text-xl">
              Откриј, спореди и научи да користиш AI алатки за работа, учење и креативност.
            </p>
            <HeroSearch />
            {activeCategories.length ? (
              <div className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-2">
                <span className="mr-2 label-mono text-graphite">Брз пристап:</span>
                {activeCategories.slice(0, 5).map((category) => (
                  <Link
                    key={category.slug}
                    to={`/kategorii/${category.slug}`}
                    className="rounded-xs border border-ink/30 bg-white px-2.5 py-1 text-sm hover:border-ink hover:bg-cream"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-10 hidden lg:block">
              <HeroAnnotation />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[21rem] sm:max-w-[26rem] lg:max-w-none">
            <HeroCollage />
          </div>
          <div className="lg:hidden">
            <HeroAnnotation />
          </div>
        </div>
      </section>

      {home.tool_count === 0 ? (
        <div className="container-page mt-10">
          <div className="border-l-4 border-mustard bg-white px-5 py-4">
            <p className="font-medium">Уредниците ги проверуваат првите алатки.</p>
            <p className="mt-1 text-graphite">
              Секоја алатка се објавува дури откако ќе ги провериме описот, цените и условите на официјалната страница. Во меѓувреме, погледни ги{' '}
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

      {/* Categories */}
      <section className="container-page mt-16 md:mt-20" aria-labelledby="home-categories">
        <SectionHeader
          id="home-categories"
          index="№ 01 — Индекс"
          title="Категории"
          description="Од пишување до програмирање: избери област и види ги проверените алатки во неа."
          link={{ to: '/kategorii', label: 'Сите категории' }}
        />
        <CategoryIndex categories={site.categories} />
      </section>

      <AdSlot placement="home" className="container-page mt-14" />

      {/* Featured + recent */}
      {home.featured_tools.length || home.recent_tools.length ? (
        <section className="container-page mt-16 grid gap-12 md:mt-20 lg:grid-cols-[2fr_1fr] lg:gap-10" aria-label="Алатки">
          {home.featured_tools.length ? (
            <div>
              <SectionHeader index="№ 02 — Уреднички избор" title="Издвоени алатки" description="Алатки што уредништвото ги издвојува како добра почетна точка во својата категорија." />
              <ul className="grid gap-5 sm:grid-cols-2">
                {home.featured_tools.map((tool) => (
                  <li key={tool.id}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {home.recent_tools.length ? (
            <div className={home.featured_tools.length ? '' : 'lg:col-span-2'}>
              <SectionHeader index="№ 03 — Ново" title="Нови во каталогот" link={{ to: '/alatki?sort=novi', label: 'Сите' }} />
              <ul className="border-t border-ink/15">
                {home.recent_tools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Wizard band */}
      <section className="relative mt-20 overflow-hidden bg-ink text-paper md:mt-24" aria-labelledby="home-wizard">
        <div aria-hidden className="absolute -top-24 -right-24 h-80 w-80 rounded-full opacity-25 halftone-coarse invert" />
        <div className="container-page relative grid gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="label-mono text-mustard">Прашалник · 5 прашања</p>
            <h2 id="home-wizard" className="mt-3 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] ink-offset md:text-6xl">
              Не знаеш која алатка ти треба?
            </h2>
            <p className="mt-5 max-w-md text-lg text-light">
              Одговори на пет кратки прашања. Препораките се засноваат на проверени податоци и за секоја алатка гледаш зошто е предложена.
            </p>
            <ButtonLink to="/pronajdi" variant="accent" size="lg" className="mt-8">
              Започни <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <ol className="self-center border-t border-paper/20">
            {WIZARD_QUESTIONS.map((question, index) => (
              <li key={question} className="flex items-baseline gap-4 border-b border-paper/20 py-3.5">
                <span className="font-mono text-sm text-mustard">0{index + 1}</span>
                <span className="text-lg">{question}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Collections */}
      {home.collections.length ? (
        <section className="container-page mt-20" aria-labelledby="home-collections">
          <SectionHeader
            id="home-collections"
            index="№ 04 — Листи"
            title="Најдобри според намена"
            description="Уреднички листи со објаснета методологија. Позициите не се продаваат."
            link={{ to: '/najdobri', label: 'Сите листи' }}
          />
          <ul className="grid gap-6 md:grid-cols-3">
            {home.collections.map((collection, index) => (
              <li key={collection.id}>
                <CollectionCard collection={collection} index={index} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Guides */}
      {leadArticle ? (
        <section className="container-page mt-20" aria-labelledby="home-guides">
          <SectionHeader id="home-guides" index="№ 05 — Водичи" title="Научи да ги користиш" link={{ to: '/vodici', label: 'Сите водичи' }} />
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <ArticleCard article={leadArticle} variant="lead" />
            {otherArticles.length ? (
              <div className="border-t border-ink/20 lg:border-t-0 lg:border-l lg:pl-8">
                {otherArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} variant="compact" />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Comparisons */}
      {home.comparisons.length ? (
        <section className="container-page mt-20" aria-labelledby="home-comparisons">
          <SectionHeader id="home-comparisons" index="№ 06 — Споредби" title="Една до друга" link={{ to: '/sporedbi', label: 'Сите споредби' }} />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {home.comparisons.map((comparison) => (
              <li key={comparison.id}>
                <ComparisonCard comparison={comparison} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Newsletter */}
      <section className="container-page mt-20" aria-labelledby="home-newsletter">
        <div className="relative grid gap-8 border border-ink bg-cream px-5 py-8 md:grid-cols-[1fr_1.2fr] md:px-10 md:py-10">
          <div>
            <p className="label-mono text-tomato-ink">Билтен</p>
            <h2 id="home-newsletter" className="mt-2 font-display text-3xl leading-tight font-extrabold">
              Новото од каталогот, без спам.
            </h2>
            <p className="mt-2 text-graphite">Повремен преглед на нови алатки, споредби и водичи. Одјава со еден клик.</p>
          </div>
          <NewsletterSignup />
        </div>
      </section>
    </>
  )
}
