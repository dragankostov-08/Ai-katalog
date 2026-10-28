import { getSupabase } from '../lib/supabase'
import type { ContentStatus } from '../lib/types'

const CONSTRAINT_MESSAGES: Record<string, string> = {
  tools_published_minimum: 'За објавување се потребни: официјална адреса, краток опис (најмалку 20 знаци) и главна категорија.',
  tools_price_needs_currency: 'Почетната цена бара валута (на пр. EUR).',
  tools_verified_has_date: 'Проверената алатка мора да има датум на проверка.',
  articles_published_minimum: 'За објавување: содржина од најмалку 200 знаци и краток опис од најмалку 20 знаци.',
  articles_cover_alt: 'Насловната слика бара алтернативен текст.',
  comparisons_published_minimum: 'За објавување: вовед од најмалку 40 знаци.',
  collections_published_minimum: 'За објавување: методологија од најмалку 60 знаци и опис од најмалку 20 знаци.',
  collection_tools_editorial_reason_check: 'Секоја алатка во листата бара уредничко образложение (10–1200 знаци).',
}

const COLUMN_MESSAGES: [RegExp, string][] = [
  [/_slug_check/, 'Слагот смее да содржи само мали латинични букви, бројки и цртички (на пр. moja-alatka).'],
  [/_(website_url|logo_url|cover_image_url)_check/, 'Адресата мора да почнува со https:// и да нема празни места.'],
  [/_(seo_title)_check/, 'SEO насловот може да има најмногу 70 знаци.'],
  [/_(seo_description)_check/, 'SEO описот може да има најмногу 170 знаци.'],
  [/_short_description_check/, 'Краткиот опис може да има најмногу 280 знаци.'],
  [/_currency_check/, 'Валутата е код од три големи букви, на пр. EUR, USD или MKD.'],
  [/_name_check|_title_check/, 'Насловот/името е празно или предолго.'],
  [/_platforms_check|_capabilities_check/, 'Избрана е непозната вредност.'],
]

export class AdminError extends Error {}

export interface YouTubeResult {
  youtube_id: string
  title: string
  channel_title: string | null
  channel_id: string | null
  video_published_at: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  embeddable: boolean
  language: 'mk' | 'regional' | 'en' | 'other'
}

export interface AdminToolVideo {
  id: string
  tool_id: string
  youtube_id: string
  title: string
  channel_title: string | null
  channel_id: string | null
  language: 'mk' | 'regional' | 'en' | 'other'
  duration_seconds: number | null
  video_published_at: string | null
  note: string | null
  is_visible: boolean
  position: number
  source: 'manual' | 'youtube_search'
  metadata_refreshed_at: string | null
}

/** Calls the `youtube` Edge Function (API key stays on the server). */
async function youtube<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('youtube', { body })
  if (!error) return data as T
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    const detail = (await context.json().catch(() => null)) as { error?: string; message?: string } | null
    if (detail?.error === 'not_configured') throw new AdminError('YouTube пребарувањето не е поставено (YOUTUBE_API_KEY). Видеата можеш да ги додаваш рачно со линк.')
    if (detail?.message && ['youtube_error', 'invalid_query', 'forbidden'].includes(detail.error ?? '')) throw new AdminError(detail.message)
  }
  throw new AdminError('YouTube функцијата не е достапна. Провери дали е поставена (docs/YOUTUBE.md). Видеата можеш да ги додаваш рачно со линк.')
}

export function translateError(error: { code?: string; message?: string; details?: string | null }): string {
  const text = `${error.message ?? ''} ${error.details ?? ''}`
  if (error.code === '23505') return 'Веќе постои запис со истиот слаг. Избери друг.'
  if (error.code === '42501') return error.message?.match(/[\u0400-\u04FF]/) ? error.message : 'Немаш дозвола за оваа операција.'
  if (error.code === '23514') {
    for (const [name, message] of Object.entries(CONSTRAINT_MESSAGES)) if (text.includes(name)) return message
    for (const [pattern, message] of COLUMN_MESSAGES) if (pattern.test(text)) return message
    return error.message?.match(/[\u0400-\u04FF]/) ? error.message : 'Податоците не ги исполнуваат правилата за зачувување.'
  }
  if (error.code === '22P02' || error.code === '22007' || error.code === '22008') return 'Некое поле има невалиден формат (број, датум или идентификатор).'
  if (error.code === '23503') return 'Записот е поврзан со друга содржина што не постои.'
  if (error.code === 'PGRST301' || error.code === 'PGRST303') return 'Сесијата истече. Најави се повторно.'
  return error.message || 'Непозната грешка.'
}

export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args)
  if (error) throw new AdminError(translateError(error))
  return data as T
}

export type Entity = 'tools' | 'categories' | 'use_cases' | 'articles' | 'comparisons' | 'collections'

export interface ListResult<T> {
  total: number
  items: T[]
}

export interface AdminMe {
  user_id: string | null
  email: string | null
  role: 'admin' | 'editor' | null
}

export interface AdminOption {
  id: string
  name: string
  slug: string
  status: ContentStatus
}

export interface AdminOptions {
  categories: AdminOption[]
  use_cases: AdminOption[]
  tools: AdminOption[]
}

export const adminApi = {
  me: () => call<AdminMe>('admin_me'),
  dashboard: () => call<Record<string, unknown>>('admin_dashboard'),
  list: <T>(entity: Entity, status?: string, query?: string, limit = 50, offset = 0) =>
    call<ListResult<T>>('admin_list', { p_entity: entity, p_status: status || null, p_query: query || null, p_limit: limit, p_offset: offset }),
  options: () => call<AdminOptions>('admin_options'),
  setStatus: (entity: Entity, id: string, status: ContentStatus) => call<void>('admin_set_status', { p_entity: entity, p_id: id, p_status: status }),
  remove: (entity: Entity | 'submissions' | 'contact_messages', id: string) => call<void>('admin_delete', { p_entity: entity, p_id: id }),
  getTool: (id: string) => call<Record<string, unknown> | null>('admin_get_tool', { p_id: id }),
  saveTool: (payload: Record<string, unknown>) => call<string>('admin_save_tool', { p: payload }),
  verifyTool: (id: string, note: string, nextReview: string | null) =>
    call<void>('admin_verify_tool', { p_id: id, p_note: note || null, p_next_review: nextReview || null }),
  flagTool: (id: string, note: string) => call<void>('admin_flag_tool', { p_id: id, p_note: note }),
  reviewQueue: () => call<{ needs_review: Record<string, unknown>[]; verification: Record<string, unknown>[] }>('admin_review_queue'),
  saveCategory: (payload: Record<string, unknown>) => call<string>('admin_save_category', { p: payload }),
  saveUseCase: (payload: Record<string, unknown>) => call<string>('admin_save_use_case', { p: payload }),
  getArticle: (id: string) => call<Record<string, unknown> | null>('admin_get_article', { p_id: id }),
  saveArticle: (payload: Record<string, unknown>) => call<string>('admin_save_article', { p: payload }),
  getComparison: (id: string) => call<Record<string, unknown> | null>('admin_get_comparison', { p_id: id }),
  saveComparison: (payload: Record<string, unknown>) => call<string>('admin_save_comparison', { p: payload }),
  getCollection: (id: string) => call<Record<string, unknown> | null>('admin_get_collection', { p_id: id }),
  saveCollection: (payload: Record<string, unknown>) => call<string>('admin_save_collection', { p: payload }),
  submissions: (status: string) => call<Record<string, unknown>[]>('admin_submissions', { p_status: status }),
  updateSubmission: (id: string, status: string, note: string) =>
    call<void>('admin_update_submission', { p_id: id, p_status: status, p_note: note || null }),
  messages: (status: string) => call<Record<string, unknown>[]>('admin_messages', { p_status: status }),
  updateMessage: (id: string, status: string) => call<void>('admin_update_message', { p_id: id, p_status: status }),
  analytics: (days: number) => call<Record<string, unknown>>('admin_analytics', { p_days: days }),
  newsletter: () => call<Record<string, unknown>>('admin_newsletter'),
  saveSettings: (payload: Record<string, string>) => call<void>('admin_save_settings', { p: payload }),
  toolVideos: (toolId: string) => call<AdminToolVideo[]>('admin_tool_videos', { p_tool_id: toolId }),
  saveToolVideo: (payload: Record<string, unknown>) => call<string>('admin_save_tool_video', { p: payload }),
  reorderToolVideos: (toolId: string, ids: string[]) => call<void>('admin_reorder_tool_videos', { p_tool_id: toolId, p_ids: ids }),
  deleteToolVideo: (id: string) => call<void>('admin_delete_tool_video', { p_id: id }),
  refreshToolVideos: (toolId: string, found: YouTubeResult[], missing: string[]) =>
    call<{ updated: number; hidden: number }>('admin_refresh_tool_videos', { p_tool_id: toolId, p_found: found, p_missing: missing }),
  youtubeSearch: (query: string, language: string) => youtube<{ items: YouTubeResult[] }>({ action: 'search', query, language }),
  youtubeLookup: (ids: string[]) => youtube<{ items: YouTubeResult[]; missing: string[] }>({ action: 'lookup', ids }),
}
