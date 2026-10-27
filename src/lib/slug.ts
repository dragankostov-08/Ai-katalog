const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz', и: 'i', ј: 'j',
  к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh',
  // Common characters from neighbouring alphabets that appear in tool names.
  й: 'j', ы: 'y', э: 'e', ю: 'ju', я: 'ja', ё: 'e', щ: 'sht', ъ: '', ь: '', ђ: 'dj', ћ: 'c', є: 'e', ї: 'i', і: 'i',
}

/** Macedonian-aware transliteration to a URL slug: „Генерирање слики“ → „generiranje-sliki“. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
