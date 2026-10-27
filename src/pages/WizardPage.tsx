import { AlertTriangle, ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLoaderData, useRouteLoaderData, useSearchParams } from 'react-router'
import { PricingBadge, VerificationBadge } from '../components/catalog/Badges'
import { OfficialLink } from '../components/catalog/OfficialLink'
import { ToolLogo } from '../components/catalog/ToolLogo'
import { Button, ButtonLink } from '../components/ui/Button'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { SponsoredTag } from '../components/ui/Labels'
import { EmptyState } from '../components/ui/States'
import { trackEvent } from '../lib/analytics'
import { fetchWizardTools } from '../lib/api'
import { capabilityLabels, platformLabels, skillDescriptions, skillLabels } from '../lib/labels'
import {
  answersFromSearch,
  answersToSearch,
  emptyAnswers,
  isComplete,
  recommend,
  type BudgetAnswer,
  type LanguageAnswer,
  type Recommendation,
  type WizardAnswers,
} from '../lib/recommend'
import type { RouteHandle } from '../lib/seo'
import { CAPABILITIES, PLATFORMS, type SiteData, type SkillLevel, type WizardTool } from '../lib/types'

export const loader = ({ request }: { request: Request }) => fetchWizardTools(request.signal)

export const handle: RouteHandle = {
  meta: ({ location }) => ({
    title: 'Пронајди AI алатка за твојата задача',
    description: 'Одговори на пет прашања и добиј предлози за AI алатки според задачата, искуството, буџетот, платформата и јазикот — со објаснување зошто.',
    path: '/pronajdi',
    noindex: Boolean(location.search),
  }),
}

const STEPS = ['Задача', 'Искуство', 'Буџет', 'Можности', 'Платформа и јазик'] as const

const BUDGETS: { value: BudgetAnswer; label: string; hint: string }[] = [
  { value: 'free_only', label: 'Да, мора да биде бесплатна', hint: 'Само алатки со бесплатен план или отворен код.' },
  { value: 'free_or_trial', label: 'Бесплатна или со бесплатна проба', hint: 'Прифаќам и платени алатки со пробен период.' },
  { value: 'any', label: 'Не е пресудно', hint: 'Подготвен/а сум да платам за вистинската алатка.' },
]

const LANGUAGES: { value: LanguageAnswer; label: string; hint: string }[] = [
  { value: 'mk_required', label: 'Мора да работи на македонски', hint: 'Предност добиваат алатки со потврдена поддршка.' },
  { value: 'any', label: 'Не е важно', hint: 'Можам да работам и на англиски.' },
]

function OptionCard({
  type,
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  type: 'radio' | 'checkbox'
  name: string
  checked: boolean
  onChange: () => void
  label: string
  hint?: string
}) {
  return (
    <label
      className={`relative flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
        checked ? 'border-ink bg-white shadow-offset-sm' : 'border-ink/25 bg-white/60 hover:border-ink'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 shrink-0 accent-ink" />
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-graphite">{hint}</span> : null}
      </span>
      {checked ? <span aria-hidden className="absolute top-0 right-0 h-2 w-2 bg-tomato" /> : null}
    </label>
  )
}

function Step({ index, title, hint, children }: { index: number; title: string; hint?: string; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    // Move focus to the new question for keyboard and screen-reader users.
    if (mounted.current) headingRef.current?.focus()
    mounted.current = true
  }, [index])
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{title}</legend>
      <p className="label-mono text-tomato-ink">Прашање {index + 1} од {STEPS.length}</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-3xl leading-tight font-extrabold focus:outline-none md:text-4xl">
        {title}
      </h2>
      {hint ? <p className="mt-2 text-graphite">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </fieldset>
  )
}

function ResultCard({ item, rank, onSelect }: { item: Recommendation; rank: number; onSelect: () => void }) {
  const { tool } = item
  return (
    <li className="grid gap-5 border-t-2 border-ink pt-5 md:grid-cols-[3rem_1fr_15rem]">
      <span className="font-mono text-sm text-graphite">#{rank}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <ToolLogo name={tool.name} src={tool.logo_url} />
          <div>
            <h3 className="font-display text-2xl leading-tight font-extrabold">
              <Link to={`/alatka/${tool.slug}`} onClick={onSelect} className="hover:underline hover:decoration-tomato hover:underline-offset-4">
                {tool.name}
              </Link>
            </h3>
            <p className="text-sm text-graphite">{tool.short_description}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-mono mb-1.5 text-teal-ink">Зошто е предложена</p>
            <ul className="space-y-1.5 text-sm">
              {item.reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-ink" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
          {item.cautions.length || tool.cons.length ? (
            <div>
              <p className="label-mono mb-1.5 text-tomato-ink">Обрни внимание</p>
              <ul className="space-y-1.5 text-sm">
                {[...item.cautions, ...tool.cons.slice(0, 2)].map((caution) => (
                  <li key={caution} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tomato-ink" aria-hidden />
                    {caution}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 md:border-l md:border-ink/15 md:pl-5">
        <PricingBadge tool={tool} />
        <VerificationBadge status={tool.verification_status} date={tool.last_verified_at} />
        {tool.is_sponsored ? <SponsoredTag /> : null}
        <Link to={`/alatka/${tool.slug}`} onClick={onSelect} className="text-sm font-medium underline underline-offset-4">
          Цел профил
        </Link>
        {tool.website_url ? (
          <OfficialLink url={tool.website_url} slug={tool.slug} context="wizard" variant="text" sponsored={tool.is_sponsored} className="text-sm" />
        ) : null}
      </div>
    </li>
  )
}

export function Component() {
  const tools = useLoaderData() as WizardTool[]
  const site = useRouteLoaderData('root') as SiteData
  const [searchParams, setSearchParams] = useSearchParams()
  const taskSlugs = useMemo(() => site.use_cases.map((u) => u.slug), [site.use_cases])
  const fromUrl = useMemo(() => answersFromSearch(searchParams, taskSlugs), [searchParams, taskSlugs])
  const [answers, setAnswers] = useState<WizardAnswers>(fromUrl)
  const [step, setStep] = useState(0)
  const showResults = isComplete(fromUrl)
  const resultsRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    setAnswers(fromUrl)
  }, [fromUrl])

  const result = useMemo(() => (showResults ? recommend(tools, fromUrl) : null), [tools, fromUrl, showResults])

  useEffect(() => {
    if (showResults && fromUrl.task) {
      trackEvent('wizard_complete', fromUrl.task)
      resultsRef.current?.focus()
    }
  }, [showResults, fromUrl.task])

  const set = <K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) => setAnswers((current) => ({ ...current, [key]: value }))
  const toggle = <T extends string>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const canContinue = [answers.task, answers.level, answers.budget, true, answers.language][step]
  const finish = () => setSearchParams(answersToSearch(answers))
  const restart = () => {
    setAnswers(emptyAnswers)
    setStep(0)
    setSearchParams(new URLSearchParams())
  }
  const taskLabel = site.use_cases.find((u) => u.slug === fromUrl.task)?.task_label

  return (
    <div className="container-page pt-8 md:pt-12">
      <Breadcrumbs items={[{ name: 'Почетна', path: '/' }, { name: 'Пронајди алатка' }]} />
      <header className="max-w-3xl">
        <p className="label-mono text-tomato-ink">Прашалник</p>
        <h1 className="mt-2 font-display text-4xl leading-[0.95] font-black tracking-[-0.03em] md:text-6xl">Пронајди алатка за твојата задача</h1>
        <p className="mt-4 text-lg text-graphite">
          Пет прашања. Препораките се пресметуваат според проверени податоци во каталогот — без вештачка интелигенција и без платени позиции.
        </p>
      </header>

      {!showResults ? (
        <form
          className="mt-10 max-w-3xl border border-ink bg-paper p-5 md:p-8"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canContinue) return
            if (step < STEPS.length - 1) setStep(step + 1)
            else finish()
          }}
        >
          <ol className="mb-8 grid grid-cols-5 gap-1.5" aria-label="Напредок">
            {STEPS.map((label, index) => (
              <li key={label} aria-current={index === step ? 'step' : undefined}>
                <span className={`block h-1.5 ${index <= step ? 'bg-ink' : 'bg-light'}`} />
                <span className={`mt-1.5 hidden font-mono text-[0.625rem] tracking-wide uppercase sm:block ${index === step ? 'text-ink' : 'text-graphite'}`}>
                  {label}
                </span>
              </li>
            ))}
          </ol>

          {step === 0 ? (
            <Step index={0} title="Што сакаш да направиш?">
              {site.use_cases.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {site.use_cases.map((useCase) => (
                    <OptionCard
                      key={useCase.slug}
                      type="radio"
                      name="task"
                      checked={answers.task === useCase.slug}
                      onChange={() => set('task', useCase.slug)}
                      label={useCase.task_label}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-graphite">Намените сè уште не се внесени во каталогот.</p>
              )}
            </Step>
          ) : null}

          {step === 1 ? (
            <Step index={1} title="Колку искуство имаш со AI алатки?">
              <div className="grid gap-2.5">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => (
                  <OptionCard
                    key={level}
                    type="radio"
                    name="level"
                    checked={answers.level === level}
                    onChange={() => set('level', level)}
                    label={skillLabels[level]}
                    hint={skillDescriptions[level]}
                  />
                ))}
              </div>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step index={2} title="Ти треба ли бесплатна алатка?">
              <div className="grid gap-2.5">
                {BUDGETS.map((option) => (
                  <OptionCard
                    key={option.value}
                    type="radio"
                    name="budget"
                    checked={answers.budget === option.value}
                    onChange={() => set('budget', option.value)}
                    label={option.label}
                    hint={option.hint}
                  />
                ))}
              </div>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step index={3} title="Кои можности ти се неопходни?" hint="Незадолжително. Избери само тоа без што не можеш.">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {CAPABILITIES.map((capability) => (
                  <OptionCard
                    key={capability}
                    type="checkbox"
                    name="capabilities"
                    checked={answers.capabilities.includes(capability)}
                    onChange={() => set('capabilities', toggle(answers.capabilities, capability))}
                    label={capabilityLabels[capability]}
                  />
                ))}
              </div>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step index={4} title="На која платформа и на кој јазик?">
              <p className="label-mono mb-2 text-graphite">Платформи (незадолжително)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PLATFORMS.map((platform) => (
                  <OptionCard
                    key={platform}
                    type="checkbox"
                    name="platforms"
                    checked={answers.platforms.includes(platform)}
                    onChange={() => set('platforms', toggle(answers.platforms, platform))}
                    label={platformLabels[platform]}
                  />
                ))}
              </div>
              <p className="label-mono mt-6 mb-2 text-graphite">Јазик</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {LANGUAGES.map((option) => (
                  <OptionCard
                    key={option.value}
                    type="radio"
                    name="language"
                    checked={answers.language === option.value}
                    onChange={() => set('language', option.value)}
                    label={option.label}
                    hint={option.hint}
                  />
                ))}
              </div>
            </Step>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink/20 pt-5">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Назад
            </Button>
            <Button type="submit" disabled={!canContinue}>
              {step < STEPS.length - 1 ? 'Следно' : 'Прикажи препораки'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      ) : (
        <section className="mt-10" aria-labelledby="wizard-results">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <p className="label-mono text-graphite">Резултати</p>
              <h2 id="wizard-results" ref={resultsRef} tabIndex={-1} className="mt-1 font-display text-3xl font-extrabold focus:outline-none md:text-4xl">
                {taskLabel ? `${taskLabel}: ` : ''}
                {result?.matches.length ? `${result.matches.length} предлози` : 'нема точно совпаѓање'}
              </h2>
            </div>
            <Button variant="secondary" onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Почни одново
            </Button>
          </div>

          <details className="mt-4 max-w-3xl text-sm text-graphite">
            <summary className="cursor-pointer font-medium text-ink">Како се рангирани предлозите?</summary>
            <div className="mt-2 space-y-2">
              <p>
                Алатката мора да е означена за избраната задача. Поени добива за потврдено ниво на сложеност, бесплатен пристап, можности, платформи и
                поддршка за македонски — само кога тие податоци се внесени и проверени. Непознат податок никогаш не носи поени, а спонзорството нема
                влијание врз редоследот.
              </p>
              <p>
                <Link to="/metodologija" className="underline">
                  Повеќе за методологијата
                </Link>
              </p>
            </div>
          </details>

          {result && result.matches.length ? (
            <ol className="mt-8 space-y-8">
              {result.matches.map((item, index) => (
                <ResultCard key={item.tool.id} item={item} rank={index + 1} onSelect={() => trackEvent('recommendation_select', item.tool.slug)} />
              ))}
            </ol>
          ) : (
            <div className="mt-8">
              <EmptyState
                title="Немаме алатка што ги исполнува сите услови"
                action={
                  <>
                    <Button variant="secondary" onClick={restart}>
                      Промени ги одговорите
                    </Button>
                    <ButtonLink to={fromUrl.task ? `/alatki?namena=${fromUrl.task}` : '/alatki'}>Сите алатки за задачата</ButtonLink>
                  </>
                }
              >
                Пробај да го олесниш условот за цена или платформа, или разгледај ги сите алатки за оваа задача.
              </EmptyState>
            </div>
          )}

          {result && result.unconfirmed.length ? (
            <section className="mt-14" aria-labelledby="wizard-unconfirmed">
              <h2 id="wizard-unconfirmed" className="font-display text-2xl font-extrabold">
                Можеби, но не е потврдено
              </h2>
              <p className="mt-1 max-w-2xl text-graphite">Овие алатки одговараат на задачата, но не сме потврдиле дали имаат бесплатен план.</p>
              <ol className="mt-6 space-y-8">
                {result.unconfirmed.map((item, index) => (
                  <ResultCard key={item.tool.id} item={item} rank={index + 1} onSelect={() => trackEvent('recommendation_select', item.tool.slug)} />
                ))}
              </ol>
            </section>
          ) : null}
        </section>
      )}
    </div>
  )
}
