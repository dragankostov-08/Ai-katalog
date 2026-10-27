import type {
  Capability,
  ContentStatus,
  LanguageSupport,
  Platform,
  PricePeriod,
  PricingType,
  SkillLevel,
  VerificationStatus,
} from './types'

export const pricingLabels: Record<PricingType, string> = {
  free: 'Бесплатна',
  freemium: 'Фримиум',
  paid: 'Платена',
  free_trial: 'Пробен период',
  open_source: 'Отворен код',
  unknown: 'Непознато',
}

export const pricingDescriptions: Record<PricingType, string> = {
  free: 'Целосно бесплатна за користење.',
  freemium: 'Бесплатен основен план, со платени планови за повеќе можности.',
  paid: 'Бара плаќање за користење.',
  free_trial: 'Платена, со бесплатен пробен период.',
  open_source: 'Отворен код — може да се користи и инсталира бесплатно; хостираните услуги може да се наплаќаат.',
  unknown: 'Моделот на плаќање сè уште не е утврден.',
}

export const pricePeriodLabels: Record<PricePeriod, string> = {
  month: 'месечно',
  year: 'годишно',
  one_time: 'еднократно',
  usage: 'според потрошувачка',
}

export const platformLabels: Record<Platform, string> = {
  web: 'Веб',
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  ios: 'iOS',
  android: 'Android',
  api: 'API',
  browser_extension: 'Додаток за прелистувач',
}

export const capabilityLabels: Record<Capability, string> = {
  api_access: 'API пристап',
  integrations: 'Интеграции со други апликации',
  team_collaboration: 'Тимска соработка',
  file_upload: 'Прикачување датотеки',
  export: 'Извоз на резултати',
  open_source: 'Отворен код',
  offline: 'Работа без интернет',
  commercial_use: 'Дозволена комерцијална употреба',
}

export const skillLabels: Record<SkillLevel, string> = {
  beginner: 'Почетник',
  intermediate: 'Средно ниво',
  advanced: 'Напредно',
}

export const skillDescriptions: Record<SkillLevel, string> = {
  beginner: 'Едноставна за почеток, без техничко знаење.',
  intermediate: 'Потребно е малку време за учење.',
  advanced: 'Бара техничко знаење или инсталација.',
}

export const languageSupportLabels: Record<LanguageSupport, string> = {
  yes: 'Поддржан',
  partial: 'Делумно поддржан',
  no: 'Не е поддржан',
  unknown: 'Не е проверено',
}

export const verificationLabels: Record<VerificationStatus, string> = {
  verified: 'Проверено',
  unverified: 'Непроверено',
  needs_update: 'Се ажурира',
}

export const statusLabels: Record<ContentStatus, string> = {
  draft: 'Нацрт',
  needs_review: 'За преглед',
  published: 'Објавено',
  archived: 'Архивирано',
}

export const accentClasses = {
  tomato: 'bg-tomato',
  mustard: 'bg-mustard',
  teal: 'bg-teal',
  raspberry: 'bg-raspberry',
  ink: 'bg-ink',
} as const

/** Macedonian plural for counts: 1 алатка, 2 алатки, 21 алатка, 11 алатки. */
export function plural(count: number, one: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  return mod10 === 1 && mod100 !== 11 ? one : many
}
