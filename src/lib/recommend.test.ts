import { describe, expect, it } from 'vitest'
import { answersFromSearch, answersToSearch, recommend, scoreTool, type WizardAnswers } from './recommend'
import type { WizardTool } from './types'

function tool(overrides: Partial<WizardTool>): WizardTool {
  return {
    id: overrides.slug ?? 'x',
    slug: 'x',
    name: 'X',
    short_description: '',
    logo_url: null,
    website_url: 'https://example.com',
    pricing_type: 'unknown',
    has_free_plan: null,
    starting_price: null,
    currency: null,
    price_period: null,
    verification_status: 'unverified',
    last_verified_at: null,
    is_featured: false,
    is_sponsored: false,
    published_at: null,
    category: null,
    free_plan_limits: null,
    platforms: [],
    capabilities: [],
    macedonian_support: 'unknown',
    skill_level: null,
    cons: [],
    use_cases: ['pishuvanje-tekst'],
    categories: [],
    ...overrides,
  }
}

const answers: WizardAnswers = {
  task: 'pishuvanje-tekst',
  level: 'beginner',
  budget: 'free_only',
  capabilities: [],
  platforms: [],
  language: 'any',
}

describe('recommend', () => {
  it('excludes tools that do not match the task', () => {
    const result = recommend([tool({ slug: 'a', use_cases: ['prevod'], pricing_type: 'free' })], answers)
    expect(result.matches).toHaveLength(0)
    expect(result.excludedCount).toBe(1)
  })

  it('excludes paid tools when free access is required, and separates unknown pricing', () => {
    const result = recommend(
      [
        tool({ slug: 'paid', name: 'Paid', pricing_type: 'paid' }),
        tool({ slug: 'free', name: 'Free', pricing_type: 'freemium' }),
        tool({ slug: 'unknown', name: 'Unknown' }),
      ],
      answers,
    )
    expect(result.matches.map((r) => r.tool.slug)).toEqual(['free'])
    expect(result.unconfirmed.map((r) => r.tool.slug)).toEqual(['unknown'])
  })

  it('never rewards unknown data and explains cautions', () => {
    const { result } = scoreTool(tool({ pricing_type: 'free' }), { ...answers, language: 'mk_required', platforms: ['android'] })
    expect(result.cautions.some((c) => c.includes('македонски'))).toBe(true)
    expect(result.cautions.some((c) => c.includes('Android'))).toBe(true)
    expect(result.reasons.some((r) => r.includes('македонски'))).toBe(false)
  })

  it('ranks by verified, matching attributes and ignores sponsorship', () => {
    const a = tool({ slug: 'a', name: 'A', pricing_type: 'free', skill_level: 'beginner', verification_status: 'verified', last_verified_at: '2026-01-01' })
    const b = tool({ slug: 'b', name: 'B', pricing_type: 'free', skill_level: 'advanced', is_sponsored: true })
    const result = recommend([b, a], answers)
    expect(result.matches[0].tool.slug).toBe('a')
    const sponsored = scoreTool({ ...a, is_sponsored: true }, answers).result.score
    expect(sponsored).toBe(scoreTool(a, answers).result.score)
  })

  it('round-trips answers through the URL and rejects unknown values', () => {
    const search = answersToSearch({ ...answers, capabilities: ['api_access'], platforms: ['web'] })
    expect(answersFromSearch(search, ['pishuvanje-tekst'])).toEqual({ ...answers, capabilities: ['api_access'], platforms: ['web'] })
    const bad = new URLSearchParams('zadaca=hack&nivo=god&mozhnosti=x,api_access&platformi=web,psp')
    expect(answersFromSearch(bad, ['pishuvanje-tekst'])).toMatchObject({ task: null, level: null, capabilities: ['api_access'], platforms: ['web'] })
  })
})
