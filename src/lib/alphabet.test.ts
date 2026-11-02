import { describe, expect, it } from 'vitest'
import { compareMk, letterOf } from './alphabet'

describe('Macedonian alphabetical order', () => {
  it('orders Ѓ after Д and Ќ after Т', () => {
    expect(['ќелија', 'ѓавол', 'дом', 'тест', 'ѕвезда', 'зелено'].sort(compareMk)).toEqual(['дом', 'ѓавол', 'зелено', 'ѕвезда', 'тест', 'ќелија'])
  })
  it('groups Latin terms separately', () => {
    expect(letterOf('API')).toBe('A–Z')
    expect(letterOf('Џебен')).toBe('Џ')
  })
})
