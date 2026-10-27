import { readConsent } from './consent'
import { isBackendConfigured, isBrowser } from './env'
import { rpc } from './rest'

export type AnalyticsEvent =
  | 'search'
  | 'category_view'
  | 'tool_view'
  | 'comparison_view'
  | 'article_view'
  | 'collection_view'
  | 'recommendation_select'
  | 'wizard_complete'
  | 'newsletter_signup'

export type OutboundContext = 'tool_page' | 'card' | 'comparison' | 'collection' | 'wizard' | 'article'

/**
 * Aggregate, consent-gated event counter. Only the event name and a slug-like
 * dimension are sent — never search text, form input or identifiers.
 */
export function trackEvent(event: AnalyticsEvent, dimension = '') {
  if (!isBrowser || !isBackendConfigured || !readConsent().analytics) return
  const safeDimension = dimension.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80)
  rpc('track_event', { p_event: event, p_dimension: safeDimension }, { keepalive: true }).catch(() => {})
}

/**
 * Counts a click on an official tool link. Stored only as a daily total per
 * tool; no cookie, identifier or IP address is stored (see /privatnost).
 */
export function trackOutbound(toolSlug: string, context: OutboundContext) {
  if (!isBrowser || !isBackendConfigured) return
  rpc('track_outbound', { p_tool_slug: toolSlug, p_context: context }, { keepalive: true }).catch(() => {})
}
