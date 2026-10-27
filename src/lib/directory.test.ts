import { describe, expect, it } from 'vitest'
import { activeFilterCount, hasIndexableParams, parseDirectoryParams, toApiParams, toSearchParams } from './directory'

describe('directory URL state', () => {
  it('parses and sanitises filters', () => {
    const filters = parseDirectoryParams(new URLSearchParams('q=видео&cena=free,bogus,paid&besplatno=1&platforma=ios&sort=abc&strana=3'))
    expect(filters).toMatchObject({ q: 'видео', cena: ['free', 'paid'], besplatno: true, platforma: 'ios', sort: 'abc', strana: 3 })
    expect(parseDirectoryParams(new URLSearchParams('platforma=ps5&strana=-4&sort=x'))).toMatchObject({ platforma: '', strana: 1, sort: '' })
  })

  it('round-trips through search params', () => {
    const search = 'q=chat&kategorija=video&cena=free&strana=2'
    expect(toSearchParams(parseDirectoryParams(new URLSearchParams(search))).toString()).toBe(search)
  })

  it('maps to API params with offsets', () => {
    const api = toApiParams(parseDirectoryParams(new URLSearchParams('sort=abc&strana=2')))
    expect(api).toMatchObject({ sort: 'name', offset: 24, limit: 24 })
    expect(toApiParams(parseDirectoryParams(new URLSearchParams('kategorija=a')), 'b').category).toBe('b')
  })

  it('marks filtered views as non-indexable', () => {
    expect(hasIndexableParams(parseDirectoryParams(new URLSearchParams('strana=2')))).toBe(true)
    expect(hasIndexableParams(parseDirectoryParams(new URLSearchParams('q=x')))).toBe(false)
    expect(activeFilterCount(parseDirectoryParams(new URLSearchParams('cena=free,paid&besplatno=1')))).toBe(3)
  })
})
