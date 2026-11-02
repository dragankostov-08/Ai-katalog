import { describe, expect, it } from 'vitest'
import { describeChange, digestHtml, digestText, isEmptyDigest, type DigestInput } from './digest'

const empty: DigestInput = { since: '', tools: [], price_changes: [], articles: [], comparisons: [], prompts: [], learning_paths: [], glossary: [], language_tests: [] }

describe('weekly digest', () => {
  it('describes logged price changes in Macedonian', () => {
    expect(describeChange({ field: 'pricing_type', old: '"freemium"', new: '"paid"' })).toBe('модел на плаќање: Фримиум → Платена')
    expect(describeChange({ field: 'has_free_plan', old: 'true', new: 'false' })).toBe('бесплатен план: да → не')
    expect(describeChange({ field: 'starting_price', old: null, new: '20' })).toBe('почетна цена: — → 20')
  })

  it('skips empty sections and escapes HTML', () => {
    const data = { ...empty, articles: [{ title: 'Водич <b>', slug: 'vodic' }] }
    expect(isEmptyDigest(empty)).toBe(true)
    const text = digestText(data, 'https://primer.mk', '1–7.11')
    expect(text).toContain('НОВИ ВОДИЧИ')
    expect(text).not.toContain('НОВИ АЛАТКИ')
    expect(text).toContain('https://primer.mk/vodici/vodic')
    expect(digestHtml(data, 'https://primer.mk', '1–7.11')).toContain('Водич &lt;b&gt;')
  })
})
