/*
 * Macedonian alphabetical order without relying on the runtime's locale data
 * (Ѓ, Ѕ, Ј, Љ, Њ, Ќ, Џ sit outside Unicode's Russian ordering).
 */
export const MK_ALPHABET = 'абвгдѓежзѕијклљмнњопрстќуфхцчџш'

export const LATIN_GROUP = 'A–Z'

export function letterOf(word: string): string {
  const first = word.trim().charAt(0).toLowerCase()
  return MK_ALPHABET.includes(first) ? first.toUpperCase() : LATIN_GROUP
}

function charRank(char: string): number {
  const index = MK_ALPHABET.indexOf(char)
  if (index >= 0) return 1000 + index
  return char.charCodeAt(0)
}

export function compareMk(a: string, b: string): number {
  const x = a.toLowerCase()
  const y = b.toLowerCase()
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const diff = charRank(x[i]) - charRank(y[i])
    if (diff) return diff
  }
  return x.length - y.length
}
