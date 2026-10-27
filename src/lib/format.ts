import { pricePeriodLabels } from './labels'
import type { PricePeriod } from './types'

/*
 * Dates and numbers are formatted without relying on the runtime's
 * Macedonian locale data: some browsers and server runtimes ship without it,
 * which would produce English output and break hydration of pre-rendered HTML.
 */

const TIME_ZONE = 'Europe/Skopje'

const MONTHS = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември']

// en-US data is always present; only the numeric parts are used.
const partsFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: TIME_ZONE })

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function skopjeParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]))
  return { day: Number(parts.day), month: Number(parts.month), year: Number(parts.year) }
}

/** „27 октомври 2026“ */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  const { day, month, year } = skopjeParts(date)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

/** „27.10.2026“ */
export function formatShortDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  const { day, month, year } = skopjeParts(date)
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

/** Macedonian number format: thousands separated by dots, decimal comma. */
export function formatNumber(value: number, decimals = 0): string {
  const [integer, fraction] = Math.abs(value).toFixed(decimals).split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${value < 0 ? '−' : ''}${grouped}${fraction ? `,${fraction}` : ''}`
}

export function formatPrice(amount: number | null, currency: string | null, period: PricePeriod | null): string | null {
  if (amount === null || amount === undefined || !currency) return null
  const number = Number(amount)
  const suffix = period ? ` ${pricePeriodLabels[period]}` : ''
  return `${formatNumber(number, Number.isInteger(number) ? 0 : 2)} ${currency}${suffix}`
}
