import { capabilityLabels, languageSupportLabels, platformLabels, pricingLabels } from './labels'
import type { Capability, Platform, SkillLevel, WizardTool } from './types'

/*
 * Rule-based recommendations for the /pronajdi wizard. Every point a tool
 * receives is tied to a verified database field and is shown to the visitor as
 * a reason. Unknown data never counts in a tool's favour, and sponsorship has
 * no influence on the score.
 */

export type BudgetAnswer = 'free_only' | 'free_or_trial' | 'any'
export type LanguageAnswer = 'mk_required' | 'any'

export interface WizardAnswers {
  task: string | null
  level: SkillLevel | null
  budget: BudgetAnswer | null
  capabilities: Capability[]
  platforms: Platform[]
  language: LanguageAnswer | null
}

export const emptyAnswers: WizardAnswers = {
  task: null,
  level: null,
  budget: null,
  capabilities: [],
  platforms: [],
  language: null,
}

export interface Recommendation {
  tool: WizardTool
  score: number
  reasons: string[]
  cautions: string[]
}

export interface RecommendationResult {
  matches: Recommendation[]
  /** Tools that fit the task but could not be confirmed against a hard requirement. */
  unconfirmed: Recommendation[]
  excludedCount: number
}

function hasFreeAccess(tool: WizardTool, allowTrial: boolean): boolean | null {
  if (tool.pricing_type === 'free' || tool.pricing_type === 'open_source') return true
  if (tool.has_free_plan === true || tool.pricing_type === 'freemium') return true
  if (allowTrial && tool.pricing_type === 'free_trial') return true
  if (tool.has_free_plan === false || tool.pricing_type === 'paid') return false
  return null
}

export function scoreTool(tool: WizardTool, answers: WizardAnswers): { result: Recommendation; hardFail: boolean; unknownHard: boolean } {
  const reasons: string[] = []
  const cautions: string[] = []
  let score = 0
  let hardFail = false
  let unknownHard = false
  const verified = tool.verification_status === 'verified'

  // 1. Task (required)
  if (answers.task) {
    if (tool.use_cases.includes(answers.task)) {
      score += 40
      reasons.push('Наменета е за задачата што ја избра.')
    } else {
      hardFail = true
    }
  }

  // 2. Experience level
  if (answers.level && tool.skill_level) {
    if (answers.level === 'beginner') {
      if (tool.skill_level === 'beginner') {
        score += 15
        reasons.push('Уредништвото ја оцени како погодна за почетници.')
      } else if (tool.skill_level === 'intermediate') {
        score += 3
        cautions.push('Потребно е малку време за учење.')
      } else {
        score -= 15
        cautions.push('Бара техничко знаење или инсталација.')
      }
    } else if (answers.level === 'intermediate') {
      score += tool.skill_level === 'advanced' ? 0 : 6
      if (tool.skill_level === 'advanced') cautions.push('Наменета е за напредни корисници.')
    } else {
      score += tool.skill_level === 'advanced' ? 8 : 4
    }
  } else if (answers.level) {
    cautions.push('Нивото на сложеност сè уште не е оценето.')
  }

  // 3. Budget (hard requirement when free access is required)
  if (answers.budget && answers.budget !== 'any') {
    const free = hasFreeAccess(tool, answers.budget === 'free_or_trial')
    if (free === true) {
      score += 15
      reasons.push(
        tool.pricing_type === 'free_trial'
          ? 'Има бесплатен пробен период.'
          : `Може да се користи бесплатно (${pricingLabels[tool.pricing_type].toLowerCase()}).`,
      )
      if (tool.free_plan_limits) cautions.push(`Ограничувања на бесплатниот план: ${tool.free_plan_limits}`)
    } else if (free === false) {
      hardFail = true
    } else {
      unknownHard = true
      cautions.push('Не е потврдено дали има бесплатен план.')
    }
    if (free === true && !verified) cautions.push('Цените сè уште не се проверени од уредништвото.')
  }

  // 4. Required capabilities
  for (const capability of answers.capabilities) {
    if (tool.capabilities.includes(capability)) {
      score += 10
      reasons.push(`Потврдена можност: ${capabilityLabels[capability].toLowerCase()}.`)
    } else if (tool.capabilities.length === 0) {
      cautions.push(`Не е потврдено: ${capabilityLabels[capability].toLowerCase()}.`)
    } else {
      score -= 12
      cautions.push(`Нема потврдена можност: ${capabilityLabels[capability].toLowerCase()}.`)
    }
  }

  // 5. Platforms
  for (const platform of answers.platforms) {
    if (tool.platforms.includes(platform)) {
      score += 8
      reasons.push(`Работи на: ${platformLabels[platform]}.`)
    } else if (tool.platforms.length === 0) {
      cautions.push(`Не е потврдено дали работи на ${platformLabels[platform]}.`)
    } else {
      score -= 12
      cautions.push(`Не е достапна за ${platformLabels[platform]}.`)
    }
  }

  // 6. Macedonian language
  if (answers.language === 'mk_required') {
    if (tool.macedonian_support === 'yes') {
      score += 20
      reasons.push('Поддржува македонски јазик.')
    } else if (tool.macedonian_support === 'partial') {
      score += 8
      reasons.push('Делумно поддржува македонски јазик.')
    } else if (tool.macedonian_support === 'no') {
      score -= 30
      cautions.push('Не поддржува македонски јазик.')
    } else {
      cautions.push(`Поддршка за македонски: ${languageSupportLabels.unknown.toLowerCase()}.`)
    }
  }

  if (verified) {
    score += 5
    reasons.push('Податоците се проверени од уредништвото.')
  }

  return { result: { tool, score, reasons, cautions }, hardFail, unknownHard }
}

export function recommend(tools: WizardTool[], answers: WizardAnswers, limit = 6): RecommendationResult {
  const matches: Recommendation[] = []
  const unconfirmed: Recommendation[] = []
  let excludedCount = 0

  for (const tool of tools) {
    const { result, hardFail, unknownHard } = scoreTool(tool, answers)
    if (hardFail) {
      excludedCount++
    } else if (unknownHard) {
      unconfirmed.push(result)
    } else {
      matches.push(result)
    }
  }

  const byScore = (a: Recommendation, b: Recommendation) => b.score - a.score || a.tool.name.localeCompare(b.tool.name)
  matches.sort(byScore)
  unconfirmed.sort(byScore)
  return { matches: matches.slice(0, limit), unconfirmed: unconfirmed.slice(0, 4), excludedCount }
}

/* URL serialisation so that results are shareable. */

const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const BUDGETS: BudgetAnswer[] = ['free_only', 'free_or_trial', 'any']
const LANGUAGES: LanguageAnswer[] = ['mk_required', 'any']

export function answersFromSearch(search: URLSearchParams, validTasks: string[]): WizardAnswers {
  const list = (key: string) => (search.get(key) ?? '').split(',').filter(Boolean)
  const task = search.get('zadaca')
  const level = search.get('nivo') as SkillLevel | null
  const budget = search.get('cena') as BudgetAnswer | null
  const language = search.get('jazik') as LanguageAnswer | null
  return {
    task: task && validTasks.includes(task) ? task : null,
    level: level && LEVELS.includes(level) ? level : null,
    budget: budget && BUDGETS.includes(budget) ? budget : null,
    capabilities: list('mozhnosti').filter((c): c is Capability => c in capabilityLabels),
    platforms: list('platformi').filter((p): p is Platform => p in platformLabels),
    language: language && LANGUAGES.includes(language) ? language : null,
  }
}

export function answersToSearch(answers: WizardAnswers): URLSearchParams {
  const search = new URLSearchParams()
  if (answers.task) search.set('zadaca', answers.task)
  if (answers.level) search.set('nivo', answers.level)
  if (answers.budget) search.set('cena', answers.budget)
  if (answers.capabilities.length) search.set('mozhnosti', answers.capabilities.join(','))
  if (answers.platforms.length) search.set('platformi', answers.platforms.join(','))
  if (answers.language) search.set('jazik', answers.language)
  return search
}

export const isComplete = (answers: WizardAnswers) =>
  Boolean(answers.task && answers.level && answers.budget && answers.language)
